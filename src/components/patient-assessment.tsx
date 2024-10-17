"use client"
import React from "react"
import { useState } from "react"
import { Check, Circle, FileText, ArrowRight, ArrowLeft } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet"
import { ScrollArea } from "./ui/scroll-area"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { generateSum } from "../actions/ai"
import { readStreamableValue } from "ai/rsc"

interface Stage {
  id: number;
  name: string;
  status: string;
  date: string;
  recurring?: string;
}

interface TestDetail {
  name: string;
  result: string;
}

interface TestDetails {
  [key: string]: TestDetail[];
}

const stages = [
  { id: 1, name: "Initial Assessment", status: "completed", date: "2023-06-01" },
  { id: 2, name: "General Assessment", status: "completed", date: "2023-06-15", recurring: "Every 15 days" },
  { id: 3, name: "Follow-up 1", status: "completed", date: "2023-06-17", recurring: "Every 2 days" },
  { id: 4, name: "Follow-up 2", status: "completed", date: "2023-06-19", recurring: "Every 2 days" },
  { id: 5, name: "Follow-up 3", status: "completed", date: "2023-06-21", recurring: "Every 2 days" },
]

const testDetails: TestDetails = {
  "Initial Assessment": [
    { name: "CKD Stage", result: "3" },
    { name: "Medications", result: "Lisinopril; Furosemide; Atorvastatin" }
  ],
  "General Assessment": [
    { name: "Breathlessness", result: "No" },
    { name: "Fatigue", result: "Score: 2" },
    { name: "Frequent Urination", result: "Score: 3" },
    { name: "Foamy Urine", result: "Yes" },
    { name: "Loss of Appetite", result: "No" },
    { name: "Muscle Cramps", result: "Score: 2" },
    { name: "Swollen Feet (Ankle Girth)", result: "28 cm" },
    { name: "Nausea", result: "No" },
    { name: "Itching", result: "No" },
    { name: "Chest Pain", result: "Score: 0" },
    { name: "Musculoskeletal Pain", result: "Score: 2" },
    { name: "Bad Breath", result: "No" },
    { name: "Palpitations", result: "No" },
    { name: "Abdominal Pain", result: "Score: 0" },
    { name: "BP", result: "135/85" },
    { name: "Oxygen Saturation", result: "95%" },
    { name: "Pulses", result: "85" },
    { name: "sPo2", result: "Score: 4" },
    { name: "GFR", result: "45" },
    { name: "Salt Intake", result: "Moderate" },
  ],
  "Follow-up 1": [
    { name: "Breathlessness", result: "No" },
    { name: "Fatigue", result: "Score: 2" },
    { name: "Frequent Urination", result: "Score: 3" },
    { name: "Foamy Urine", result: "Yes" },
    { name: "Loss of Appetite", result: "No" },
    { name: "Muscle Cramps", result: "Score: 2" },
    { name: "Swollen Feet (Ankle Girth)", result: "28 cm" },
    { name: "Nausea", result: "No" },
    { name: "Itching", result: "No" },
    { name: "Chest Pain", result: "Score: 0" },
    { name: "Musculoskeletal Pain", result: "Score: 2" },
    { name: "Bad Breath", result: "No" },
    { name: "Palpitations", result: "No" },
    { name: "Abdominal Pain", result: "Score: 0" },
    { name: "BP", result: "135/85" },
    { name: "Oxygen Saturation", result: "95%" },
    { name: "Pulses", result: "85" },
    { name: "sPo2", result: "Score: 4" },
    { name: "GFR", result: "45" },
    { name: "Salt Intake", result: "Moderate" },
  ],
  "Follow-up 2": [
    { name: "Breathlessness", result: "No" },
    { name: "Fatigue", result: "Score: 3" },
    { name: "Frequent Urination", result: "Score: 3" },
    { name: "Foamy Urine", result: "Yes" },
    { name: "Loss of Appetite", result: "Yes" },
    { name: "Muscle Cramps", result: "Score: 3" },
    { name: "Swollen Feet (Ankle Girth)", result: "29 cm" },
    { name: "Nausea", result: "No" },
    { name: "Itching", result: "No" },
    { name: "Chest Pain", result: "Score: 0" },
    { name: "Musculoskeletal Pain", result: "Score: 3" },
    { name: "Bad Breath", result: "No" },
    { name: "Palpitations", result: "Yes" },
    { name: "Abdominal Pain", result: "Score: 0" },
    { name: "BP", result: "130/82" },
    { name: "Oxygen Saturation", result: "93%" },
    { name: "Pulses", result: "88" },
    { name: "sPo2", result: "Score: 3" },
    { name: "GFR", result: "43" },
    { name: "Salt Intake", result: "Moderate" },
  ],
  "Follow-up 3": [
    { name: "Breathlessness", result: "Yes" },
    { name: "Fatigue", result: "Score: 4" },
    { name: "Frequent Urination", result: "Score: 2" },
    { name: "Foamy Urine", result: "Yes" },
    { name: "Loss of Appetite", result: "Yes" },
    { name: "Muscle Cramps", result: "Score: 4" },
    { name: "Swollen Feet (Ankle Girth)", result: "30 cm" },
    { name: "Nausea", result: "Yes" },
    { name: "Itching", result: "Yes" },
    { name: "Chest Pain", result: "Score: 0" },
    { name: "Musculoskeletal Pain", result: "Score: 4" },
    { name: "Bad Breath", result: "Yes" },
    { name: "Palpitations", result: "Yes" },
    { name: "Abdominal Pain", result: "Score: 0" },
    { name: "BP", result: "140/90" },
    { name: "Oxygen Saturation", result: "92%" },
    { name: "Pulses", result: "90" },
    { name: "sPo2", result: "Score: 2" },
    { name: "GFR", result: "40" },
    { name: "Salt Intake", result: "High" },
  ],
};

const dummyNextAction = `
1. Schedule a comprehensive follow-up assessment in 30 days.
2. Continue current medication regimen with no changes.
3. Encourage patient to maintain the newly adopted lifestyle changes.
4. Order a new set of lab tests to track progress of key health markers.
5. Consider gradual reduction of medication dosage if improvement continues at the current rate.
6. Provide patient with resources for stress management and sleep hygiene.
7. Schedule a consultation with a nutritionist to further optimize dietary habits.
`

type View = 'main' | 'summary' | 'nextAction';

export function PatientAssessment() {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const [view, setView] = useState<View>('main')
  const [summary, setSummary] = useState<string>('')

  const handleGenerateSummary = async () => {
    setSummary('')
    setView('summary')
    const { output } = await generateSum()
    for await (const delta of readStreamableValue(output)) {
      console.log(delta)
      setSummary(curr => `${curr}${delta}`);
    }
  };

  const handleStageClick = (stage: Stage) => {
    setSelectedStage(stage)
    setIsDrawerOpen(true)
  }

  const handleNextAction = () => {
    setView('nextAction')
  }

  const handleBack = () => {
    setView('main')
  }

  const processSummary = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex w-full">
      <div className="w-1/4 p-4 border-r">
        <div className="flex flex-col item-start">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-start mb-4 last:mb-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
                    stage.status === "completed"
                      ? "bg-green-500"
                      : stage.status === "current"
                        ? "bg-blue-500"
                        : "bg-gray-300"
                  }`}
                  onClick={() => handleStageClick(stage)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleStageClick(stage)
                    }
                  }}
                >
                  {stage.status === "completed" ? (
                    <Check className="text-white" />
                  ) : stage.status === "current" ? (
                    <Circle className="text-white" />
                  ) : (
                    <Circle className="text-gray-500" />
                  )}
                </div>
                {index !== stages.length - 1 && (
                  <div className="w-[2px] h-8 bg-gray-300 my-1" />
                )}
              </div>
              <div className="ml-4">
                <span
                  className={`text-sm font-medium ${
                    stage.status === "completed"
                      ? "text-green-500"
                      : stage.status === "current"
                        ? "text-blue-500"
                        : "text-gray-500"
                  }`}
                >
                  {stage.name}
                </span>
                <p className="text-xs text-gray-500">{stage.date}</p>
                {stage.recurring && (
                  <p className="text-xs text-gray-400">{stage.recurring}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-3/4 p-4 flex flex-col justify-center items-center">
        {view === 'main' && (
          <>
            <Button
              className="w-64 h-16 mb-4 text-lg"
              onClick={handleGenerateSummary}
            >
              <FileText className="mr-2 h-6 w-6" /> Generate Summary
            </Button>
            <Button
              className="w-64 h-16 text-lg"
              onClick={handleNextAction}
            >
              <ArrowRight className="mr-2 h-6 w-6" /> Next Course of Action
            </Button>
          </>
        )}

        {view === 'summary' && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Patient Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{processSummary(summary)}</p>
              <Button className="mt-4" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </CardContent>
          </Card>
        )}

        {view === 'nextAction' && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Next Course of Action</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{dummyNextAction}</p>
              <Button className="mt-4" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="left" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{selectedStage?.name}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)] w-full rounded-md border p-4 mt-4">
            {selectedStage && testDetails[selectedStage.name] && 
              testDetails[selectedStage.name].map((test, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <h3 className="font-semibold">{test.name}</h3>
                  <p className="text-sm text-gray-500">{test.result}</p>
                </div>
              ))}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}