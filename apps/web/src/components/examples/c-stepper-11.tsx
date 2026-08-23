"use client";

import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperTitle,
  StepperTrigger,
} from "@atlas/ui/components/reui/stepper";

const steps = [
  { title: "User Details" },
  { title: "Payment Info" },
  { title: "Auth OTP" },
  { title: "Preview Form" },
];

export const Pattern = () => (
  <Stepper className="flex w-full max-w-lg flex-col gap-8" defaultValue={2}>
    <StepperNav className="mb-10 gap-5">
      {steps.map((step, index) => (
        <StepperItem
          className="relative flex-1 items-start"
          key={step.title}
          step={index + 1}
        >
          <StepperTrigger className="flex grow flex-col items-start justify-center gap-3.5">
            <StepperIndicator className="bg-border data-[state=active]:bg-primary data-[state=completed]:bg-primary h-1 w-full rounded-full">
              <span className="sr-only">{index + 1}</span>
            </StepperIndicator>
            <StepperTitle className="group-data-[state=inactive]/step:text-muted-foreground text-start font-semibold">
              {step.title}
            </StepperTitle>
          </StepperTrigger>
        </StepperItem>
      ))}
    </StepperNav>

    <StepperPanel className="text-sm">
      {steps.map((step, index) => (
        <StepperContent
          className="flex items-center justify-center"
          key={step.title}
          value={index + 1}
        >
          {step.title} content
        </StepperContent>
      ))}
    </StepperPanel>
  </Stepper>
);
