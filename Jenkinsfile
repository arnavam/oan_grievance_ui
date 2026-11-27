pipeline {
    agent any

    options {
        // Two overlapping runs of the same branch would fight over the same Deployment.
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
    }

    environment {
        AWS_REGION      = 'ap-south-1'
        AWS_ACCOUNT_ID  = '379220350808'
        IMAGE_REGISTRY  = '379220350808.dkr.ecr.ap-south-1.amazonaws.com'   // matches image_registry in inventory/group_vars/all/main.yml
        IMAGE_NAME      = 'oan-grievance-ui'
        // Helm release `grievance-ui` on the oan_dev k3s node (develop only, stages below).
        ECR_REPO        = 'eoan/oan-grievance-ui/grievance-ui'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // develop builds the image and deploys it to oan_dev. staging builds nothing: its stages at the end
                    // promote what develop built from the same source tree to the QA cluster. Anything else (e.g. PR
                    // builds) only runs checkout + install/test.
                    env.TARGET_ENV = 'develop'

                    // Immutable, traceable tag: <env>-<build number>-<short git sha>
                    def sha = sh(returnStdout: true, script: 'git rev-parse --short=7 HEAD').trim()
                    env.IMAGE_TAG_BUILD = "${env.TARGET_ENV}-${env.BUILD_NUMBER}-${sha}"
                    env.FULL_IMAGE      = "${env.IMAGE_REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG_BUILD}"
                    echo "Branch ${env.BRANCH_NAME} -> image ${env.FULL_IMAGE}"
                }
            }
        }

        stage('Install & test') {
            steps {
                // package.json needs node >= 24 and the repo uses pnpm, so run in a node 24 container
                // instead of depending on whatever Node the Jenkins host has.
                sh '''
                    docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
                        -v "$PWD":/app -w /app node:24-alpine \
                        sh -c "npx -y pnpm@11.17.0 install --frozen-lockfile && npx -y pnpm@11.17.0 run lint"
                '''
            }
        }

        stage('Build image') {
            when { branch 'develop' }
            steps {
                // Dockerfile lives at the repo root
                sh '''
                    docker build --pull \
                        -t "$FULL_IMAGE" \
                        .
                '''
            }
        }

        // ---- develop -> Helm release `grievance-ui` on the oan_dev k3s node ----
        // The image built above is pushed under eoan/oan-grievance-ui/grievance-ui:<package.json version>-develop.<build>,
        // the tag that is also the chart version.
        stage('Push image (helm)') {
            when { branch 'develop' }
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    script {
                        env.IMMUTABLE_TAG = sh(returnStdout: true, script: 'python3 ci/package_chart.py version').trim()
                    }
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail
                        IMAGE_URI="${IMAGE_REGISTRY}/${ECR_REPO}"

                        aws ecr get-login-password --region "$AWS_REGION" \
                            | docker login --username AWS --password-stdin "$IMAGE_REGISTRY"

                        # ECR does not create a repository on push.
                        aws ecr describe-repositories --region "$AWS_REGION" --repository-names "$ECR_REPO" >/dev/null 2>&1 \
                            || aws ecr create-repository --region "$AWS_REGION" --repository-name "$ECR_REPO" >/dev/null

                        docker tag "$FULL_IMAGE" "${IMAGE_URI}:${IMMUTABLE_TAG}"
                        docker push "${IMAGE_URI}:${IMMUTABLE_TAG}"
                        docker rmi "${IMAGE_URI}:${IMMUTABLE_TAG}" || true
                        echo "Pushed ${IMAGE_URI}:${IMMUTABLE_TAG}"
                    '''
                }
            }
        }

        // staging: `promote` instead of `package`: develop's chart for this source tree, its image tagged for staging.
        stage('Package chart') {
            when { anyOf { branch 'develop'; branch 'staging' } }
            steps {
                script {
                    env.IMMUTABLE_TAG    = sh(returnStdout: true, script: 'python3 ci/package_chart.py version').trim()
                    env.IMAGE_TAG        = env.IMMUTABLE_TAG
                    env.SOURCE_COMMIT    = sh(returnStdout: true, script: 'git rev-parse --verify HEAD').trim()
                    env.COMMIT_SUBJECT   = sh(returnStdout: true, script: 'git log -1 --pretty=%s').trim()
                    env.IMAGE_REPOSITORY = "${env.IMAGE_REGISTRY}/${env.ECR_REPO}"
                }
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    script {
                        if (env.BRANCH_NAME == 'develop') {
                            // The chart pins the image by digest, which the staging promotion needs to tag the same image.
                            env.IMAGE_DIGEST = sh(returnStdout: true, script: 'aws ecr describe-images --region "$AWS_REGION" --repository-name "$ECR_REPO" --image-ids imageTag="$IMMUTABLE_TAG" --query "imageDetails[0].imageDigest" --output text').trim()
                        }
                        if (env.BRANCH_NAME == 'staging') {
                            // The workspace holds the staging branch only; promote needs the develop commits the chart index names.
                            withCredentials([gitUsernamePassword(credentialsId: scm.userRemoteConfigs[0].credentialsId, gitToolName: 'Default')]) {
                                sh 'git fetch --quiet --no-tags origin +refs/heads/develop:refs/remotes/origin/develop'
                            }
                        }
                    }
                    sh "python3 ci/package_chart.py ${env.BRANCH_NAME == 'staging' ? 'promote' : 'package'}"
                }
                // The deploy stage runs on the VPN deploy agent, which gets the archive from here.
                stash name: 'built-chart', includes: 'built-chart/**'
            }
        }

        stage('develop → oan_dev (helm)') {
            when { beforeAgent true; branch 'develop' }
            agent { label 'oan-ci-deploy' }   // VPN agent with helm and kubectl that reaches the oan_dev API
            options { timeout(time: 15, unit: 'MINUTES') }
            steps {
                checkout scm
                sh 'rm -rf built-chart'
                unstash 'built-chart'
                withCredentials([file(credentialsId: 'oan-dev-kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail
                        IMAGE_REPOSITORY="${IMAGE_REGISTRY}/${ECR_REPO}" \
                        IMMUTABLE_TAG="${IMMUTABLE_TAG}" \
                        bash ci/deploy-helm-dev.sh
                    '''
                }
            }
        }

        stage('staging → QA cluster (helm)') {
            when { beforeAgent true; branch 'staging' }
            agent { label 'oan-ci-deploy' }   // VPN agent with helm and kubectl; must reach the QA API
            options { timeout(time: 15, unit: 'MINUTES') }
            steps {
                checkout scm
                sh 'rm -rf built-chart'
                unstash 'built-chart'
                withCredentials([file(credentialsId: 'oan-qa-kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail
                        DEPLOY_ENV=staging \
                        IMAGE_REPOSITORY="${IMAGE_REGISTRY}/${ECR_REPO}" \
                        IMMUTABLE_TAG="${IMMUTABLE_TAG}" \
                        bash ci/deploy-helm-dev.sh
                    '''
                }
            }
        }

        stage('Verify') {
            when { beforeAgent true; anyOf { branch 'develop'; branch 'staging' } }
            agent { label 'oan-ci-deploy' }
            steps {
                sh '''
                    # "/" has no landing page and redirects to /login, so verify /login directly.
                    url="https://grievance.development.oanstaging.com/login"
                    [ "$BRANCH_NAME" = "staging" ] && url="https://grievance.qa.oanstaging.com/login"
                    for i in $(seq 1 10); do
                        code=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$url" || true)
                        echo "attempt $i: $url -> $code"
                        [ "$code" = "200" ] && exit 0
                        sleep 6
                    done
                    echo "grievance-ui did not return 200 at $url"
                    exit 1
                '''
            }
        }

        stage('Publish chart') {
            when { anyOf { branch 'develop'; branch 'staging' } }
            steps {
                // UNSTABLE, not failed: the image is already deployed.
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    withCredentials([usernamePassword(credentialsId: 'oan-helm-fork-token', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
                        sh 'python3 ci/package_chart.py publish'
                    }
                }
            }
        }
    }

    post {
        failure {
            echo "grievance-ui ${env.BRANCH_NAME} deploy failed Check the stage logs above."
        }
    }
}
