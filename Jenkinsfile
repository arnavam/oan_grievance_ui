pipeline {
    agent any

    environment {
        AWS_REGION      = 'ap-south-1'
        AWS_ACCOUNT_ID  = '379220350808'
        IMAGE_REGISTRY  = '379220350808.dkr.ecr.ap-south-1.amazonaws.com'   // matches image_registry in inventory/group_vars/all/main.yml
        IMAGE_NAME      = 'oan-grievance-ui'
        RKE2_NODE       = '13.233.56.204'
        K8S_NAMESPACE   = 'develop'
        // Must match the live objects: kubectl get deploy -n develop
        // (the deploy stage fails fast with a clear message if either is wrong)
        DEPLOYMENT_NAME = 'grievance-ui'
        CONTAINER_NAME  = 'grievance-ui'
        // "/" has no landing page and redirects to /login, so verify /login directly
        VERIFY_URL      = 'https://grievance-dev.oanstaging.com/login'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // Immutable, traceable tag: develop-<build number>-<short git sha>
                    def sha = sh(returnStdout: true, script: 'git rev-parse --short=7 HEAD').trim()
                    env.IMAGE_TAG_BUILD = "develop-${env.BUILD_NUMBER}-${sha}"
                    env.FULL_IMAGE      = "${env.IMAGE_REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG_BUILD}"
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
                        -t "$IMAGE_REGISTRY/$IMAGE_NAME:develop" \
                        .
                '''
            }
        }

        stage('Push image') {
            when { branch 'develop' }
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    sh '''
                        aws ecr get-login-password --region "$AWS_REGION" \
                            | docker login --username AWS --password-stdin "$IMAGE_REGISTRY"
                        docker push "$FULL_IMAGE"
                        docker push "$IMAGE_REGISTRY/$IMAGE_NAME:develop"
                    '''
                }
            }
        }

        stage('Deploy to develop (kubectl)') {
            when { branch 'develop' }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'grievance-dev-ssh-key',   // grievance.pem — create in Jenkins first, see setup notes
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    // Deploys the immutable build tag (not a floating tag + rollout restart),
                    // so every Jenkins build is a real, traceable change to the Deployment.
                    // Values are passed as arguments; the remote script is a quoted heredoc.
                    sh '''
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@$RKE2_NODE" \
    bash -s -- "$DEPLOYMENT_NAME" "$CONTAINER_NAME" "$FULL_IMAGE" "$K8S_NAMESPACE" <<'ENDSSH'
set -euo pipefail
DEPLOY="$1"; CONTAINER="$2"; IMAGE="$3"; NS="$4"
# Non-interactive SSH sessions do not load the login PATH; RKE2 keeps kubectl in its own bin dir
export PATH="$PATH:/var/lib/rancher/rke2/bin:/usr/local/bin:/snap/bin"
export KUBECONFIG="$HOME/.kube/config"

# Fail fast if the names in the Jenkinsfile do not match the cluster
kubectl get deployment "$DEPLOY" -n "$NS" > /dev/null
if ! kubectl get deployment "$DEPLOY" -n "$NS" \
        -o jsonpath='{.spec.template.spec.containers[*].name}' | tr ' ' '\\n' | grep -qx "$CONTAINER"; then
    echo "Container '$CONTAINER' not found in deployment/$DEPLOY. Containers present:"
    kubectl get deployment "$DEPLOY" -n "$NS" -o jsonpath='{.spec.template.spec.containers[*].name}'; echo
    exit 1
fi

echo "Deploying $IMAGE to deployment/$DEPLOY ($NS)"
kubectl set image "deployment/$DEPLOY" "$CONTAINER=$IMAGE" -n "$NS"

if ! kubectl rollout status "deployment/$DEPLOY" -n "$NS" --timeout=180s; then
    echo "Rollout failed, rolling back"
    kubectl rollout undo "deployment/$DEPLOY" -n "$NS"
    exit 1
fi
ENDSSH
                    '''
                }
            }
        }

        stage('Verify') {
            when { branch 'develop' }
            steps {
                sh '''
                    for i in $(seq 1 10); do
                        code=$(curl -s -o /dev/null -w "%{http_code}" "$VERIFY_URL" || true)
                        echo "attempt $i: $VERIFY_URL -> $code"
                        [ "$code" = "200" ] && exit 0
                        sleep 6
                    done
                    echo "grievance-ui did not return 200 at $VERIFY_URL"
                    exit 1
                '''
            }
        }
    }

    post {
        failure {
            echo "grievance-ui develop deploy failed — check the stage logs above."
        }
    }
}
