/* eslint-disable */

'use client'

import React, { useState, useEffect } from "react"
import { Check, FileText, ArrowRight, ArrowLeft } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet"
import { ScrollArea } from "./ui/scroll-area"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { generateSum, generateactions } from "../actions/ai"
import { readStreamableValue } from "ai/rsc"
import { Assessment } from "@prisma/client"
import { getAssessments } from "@/actions/db"

type View = 'main' | 'summary' | 'nextAction'
interface AssessmentItem {
  name: string;
  result: string;
}

export interface AssessmentWithParsedItems extends Omit<Assessment, 'items'> {
  items: AssessmentItem[];
}

interface PatientAssessmentProps {
  patientId: string;
}


export function PatientAssessment({ patientId }: PatientAssessmentProps) {
  const [assessments, setAssessments] = useState<AssessmentWithParsedItems[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentWithParsedItems | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const [view, setView] = useState<View>('main')
  const [summary, setSummary] = useState<string>('')
  const [action, setAction] = useState<string>('')

  useEffect(() => {
    const fetchAssessments = async () => {
      const data = await getAssessments(patientId)
      setAssessments(data.map(assessment => ({
        ...assessment,
        items: (Array.isArray(assessment.items)
          ? assessment.items.map((item: any) => ({
            name: item.name,
            result: item.result
          }))
          : []) as AssessmentItem[]
      })))
    }
    fetchAssessments()
  }, [patientId])

  const handleGenerateSummary = async () => {
    setSummary('')
    setView('summary')
    const { output } = await generateSum(patientId)
    for await (const delta of readStreamableValue(output)) {
      setSummary(curr => `${curr}${delta}`)
    }
  }

  const handleGenerateAction = async () => {
    setAction('')
    setView('nextAction')
    const { output } = await generateactions(patientId)
    for await (const delta of readStreamableValue(output)) {
      setAction(curr => `${curr}${delta}`)
    }
  }

  const handleAssessmentClick = (assessment: AssessmentWithParsedItems) => {
    setSelectedAssessment(assessment)
    setIsDrawerOpen(true)
  }

  const handleBack = () => setView('main')

  const processSummary = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  return (
    <div className="flex w-full">
      <div className="w-1/4 p-4 border-r">
        <div className="flex flex-col item-start">
          {assessments.map((assessment, index) => (
            <div key={assessment.id} className="flex items-start mb-4 last:mb-0">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center cursor-pointer"
                  onClick={() => handleAssessmentClick(assessment)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleAssessmentClick(assessment)
                    }
                  }}
                >
                  <Check className="text-white" />
                </div>
                {index !== assessments.length - 1 && (
                  <div className="w-[2px] h-8 bg-gray-300 my-1" />
                )}
              </div>
              <div className="ml-4">
                <span className="text-sm font-medium text-green-500">
                  {assessment.type}
                </span>
                <p className="text-xs text-gray-500">
                  {new Date(assessment.createdAt).toLocaleDateString()}
                </p>
                {assessment.daysUntilDue && (
                  <p className="text-xs text-gray-400">Every {assessment.daysUntilDue} days</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-3/4 p-4 flex flex-col justify-center items-center">
        {view === 'main' && (
          <>
            <Button className="w-64 h-16 mb-4 text-lg" onClick={handleGenerateSummary}>
              <FileText className="mr-2 h-6 w-6" /> Generate Summary
            </Button>
            <Button className="w-64 h-16 text-lg" onClick={handleGenerateAction}>
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
              <p className="whitespace-pre-line">{processSummary(action)}</p>
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
            <SheetTitle>{selectedAssessment?.type}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)] w-full rounded-md border p-4 mt-4">
            {selectedAssessment?.items.map((item, index) => (
              <div key={index} className="mb-4 last:mb-0">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.result}</p>
              </div>
            ))}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}