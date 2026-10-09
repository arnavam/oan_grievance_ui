import { Check } from "lucide-react";

interface StepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { id: 1, name: "Submitter Identity" },
  { id: 2, name: "Grievance Details" },
  { id: 3, name: "Review & Submit" },
];

export function Stepper({ currentStep, onStepClick }: StepperProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center justify-between w-full relative">
          {/* Connecting Line */}
          <div className="absolute top-[20px] left-[70px] right-[70px] h-[2px] bg-[#E5E7EB] z-0" aria-hidden="true">
            <div
              className="h-full bg-[#0b8535] transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            ></div>
          </div>

          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isClickable = isCompleted && Boolean(onStepClick);

            return (
              <li
                key={step.name}
                onClick={() => {
                  if (isClickable && onStepClick) {
                    onStepClick(step.id);
                  }
                }}
                className={`relative flex flex-col items-center group w-[140px] z-10 ${
                  isClickable ? "cursor-pointer" : ""
                }`}
              >
                {isCompleted ? (
                  <>
                    <div className="h-[42px] w-[42px] rounded-full bg-[#0b8535] border-[5px] border-[#EEF2FF] flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[13px] font-bold text-slate-500 group-hover:text-gray-900 transition-colors">
                      Step {step.id}
                    </span>
                    <span className="text-[14px] font-medium text-slate-500 mt-0.5 group-hover:text-gray-900 transition-colors">
                      {step.name}
                    </span>
                  </>
                ) : isCurrent ? (
                  <>
                    <div className="h-[42px] w-[42px] rounded-full bg-[#0b8535] border-[5px] border-[#EEF2FF] flex items-center justify-center mb-2 shadow-sm">
                      <span className="text-white text-md font-bold">{step.id}</span>
                    </div>
                    <span className="text-[13px] font-bold text-[#0b8535]">Step {step.id}</span>
                    <span className="text-[14px] font-bold text-[#374151] mt-0.5">{step.name}</span>
                  </>
                ) : (
                  <>
                    <div className="h-[42px] w-[42px] rounded-full bg-[#E5E7EB] border-[5px] border-[#F3F4F8] flex items-center justify-center mb-2">
                      <span className="text-[#6B7280] text-sm font-semibold">{step.id}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-slate-500">Step {step.id}</span>
                    <span className="text-[14px] font-medium text-slate-500 mt-0.5">{step.name}</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
