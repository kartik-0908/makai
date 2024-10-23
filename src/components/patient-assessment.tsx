/* eslint-disable */

'use client'
export const maxDuration = 60;


import React, { useState, useEffect } from "react"
import { Check, FileText, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet"
import { ScrollArea } from "./ui/scroll-area"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { generateSum, generateactions } from "../actions/ai"
import { readStreamableValue } from "ai/rsc"
import { Assessment } from "@prisma/client"
import { getAssessments } from "@/actions/db"
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  const [isLoading, setIsLoading] = useState<boolean>(false)

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
    setIsLoading(true)
    try {
      const { output } = await generateSum(patientId)
      for await (const delta of readStreamableValue(output)) {
        setSummary(curr => `${curr}${delta}`)
        console.log(summary)
        setIsLoading(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateAction = async () => {
    setAction('')
    setView('nextAction')
    setIsLoading(true)
    try {
      const { output } = await generateactions(patientId)
      for await (const delta of readStreamableValue(output)) {
        setAction(curr => `${curr}${delta}`)
      }
    } finally {
      setIsLoading(false)
    }
  }


  const handleAssessmentClick = (assessment: AssessmentWithParsedItems) => {
    setSelectedAssessment(assessment)
    setIsDrawerOpen(true)
  }

  const handleBack = () => setView('main')

  interface TableRow {
    [key: string]: string;
  }

  // Types for component props
  interface PatientSummaryCardProps {
    summary: string;
    isLoading: boolean;
    handleBack: () => void;
  }

  // Type for processed table data
  interface ProcessedTable {
    headers: string[];
    dataRows: string[][];
  }

  const processTableData = (text: string): ProcessedTable => {
    const rows = text
      .split('\n')
      .filter((line: string): boolean => line.trim().length > 0)
      .map((line: string): string[] =>
        line
          .split('|')
          .map((cell: string): string => cell.trim())
          .filter((cell: string): boolean => cell.length > 0)
      );

    return {
      headers: rows[0] || [],
      dataRows: rows.slice(2) // Skip the header and separator rows
    };
  };

  return (
    <div className="flex w-full">
      <div className="w-1/5 p-4 border-r">
        <div className="flex flex-col item-start">
          {assessments.map((assessment, index) => (
            <div key={assessment.id} className="flex items-start mb-4 last:mb-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full ${assessment.status === 'completed'
                    ? 'bg-green-500'
                    : assessment.status === 'due'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                    } flex items-center justify-center cursor-pointer`}
                  onClick={() => handleAssessmentClick(assessment)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleAssessmentClick(assessment)
                    }
                  }}
                >
                  {assessment.status === 'completed' ? (
                    <Check className="text-white" />
                  ) : assessment.status === 'due' ? (
                    <ArrowRight className="text-white" />
                  ) : (
                    <FileText className="text-white" />
                  )}
                </div>
                {index !== assessments.length - 1 && (
                  <div className="w-[2px] h-8 bg-gray-300 my-1" />
                )}
              </div>
              <div className="ml-4">
                <span className={`text-sm font-medium ${assessment.status === 'completed'
                  ? 'text-green-500'
                  : assessment.status === 'due'
                    ? 'text-yellow-500'
                    : 'text-gray-500'
                  }`}>
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

      <div className="w-4/5 p-4 flex flex-col justify-center items-center">
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
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <Markdown remarkPlugins={[remarkGfm]}>{summary}</Markdown>
                  {/* <p>{summary}</p> */}
                </>

              )}
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
              <Markdown remarkPlugins={[remarkGfm]}>{action}</Markdown>
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