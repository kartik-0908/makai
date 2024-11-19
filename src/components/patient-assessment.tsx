/* eslint-disable */

'use client'
import React, { useState, useEffect, useRef } from "react"
import { Check, FileText, ArrowRight, ArrowLeft, Loader2, Download } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet"
import { ScrollArea } from "./ui/scroll-area"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { generateSum, generateactions } from "../actions/ai"
import { readStreamableValue } from "ai/rsc"
import { Assessment } from "@prisma/client"
import ReactDOMServer from 'react-dom/server';
import { getAssessments } from "@/actions/db"
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false)

  const convertMarkdownToPDF = (markdownContent: string) => {
    // CSS variables matching your theme
    const theme = {
      background: '#ffffff',
      foreground: '#020817',
      canvasDefault: '#ffffff',
      canvasSubtle: '#f6f8fa',
      borderDefault: '#d0d7de',
      borderMuted: '#d0d7de',
    };

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margins = {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    };

    const MarkdownComponent = () => (
      <div style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        lineHeight: '1.4',
        color: theme.foreground,
        backgroundColor: theme.background,
      }}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 style={{
                fontSize: '10px',
                marginTop: '16px',
                marginBottom: '8px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}>
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 style={{
                fontSize: '8px',
                marginTop: '14px',
                marginBottom: '6px',
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}>
                {children}
              </h2>
            ),
            p: ({ children }) => (
              <p style={{
                marginBottom: '6px',
                fontSize: '10px'
              }}>
                {children}
              </p>
            ),
            hr: () => (
              <hr style={{
                margin: '10px 0',
                border: 'none',
                borderTop: `1px solid ${theme.borderMuted}`
              }} />
            ),
            table: ({ children }) => (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '10px',
                marginBottom: '16px',
                fontSize: '9px',
                border: `1px solid ${theme.borderDefault}`
              }}>
                {children}
              </table>
            ),
            tr: ({ children, isHeader }: any) => (
              <tr style={{
                backgroundColor: isHeader ? theme.canvasDefault : 'transparent',
                borderTop: `1px solid ${theme.borderMuted}`
              }}>
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th style={{
                padding: '6px 13px',
                border: `1px solid ${theme.borderDefault}`,
                fontWeight: '600',
                backgroundColor: theme.canvasDefault
              }}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td style={{
                padding: '6px 13px',
                border: `1px solid ${theme.borderDefault}`,
                backgroundColor: 'transparent'
              }}>
                {children}
              </td>
            ),
            ul: ({ children }) => (
              <ul style={{
                paddingLeft: '15px',
                marginBottom: '10px'
              }}>
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol style={{
                paddingLeft: '15px',
                marginBottom: '10px'
              }}>
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li style={{
                marginBottom: '4px',
                fontSize: '10px'
              }}>
                {children}
              </li>
            ),
            code: ({ children }) => (
              <code style={{
                backgroundColor: theme.canvasSubtle,
                padding: '2px 4px',
                borderRadius: '3px',
                fontSize: '9px',
                fontFamily: 'monospace'
              }}>
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre style={{
                backgroundColor: theme.canvasSubtle,
                padding: '8px',
                borderRadius: '4px',
                overflowX: 'auto',
                fontSize: '9px',
                fontFamily: 'monospace',
                marginBottom: '8px'
              }}>
                {children}
              </pre>
            ),
          }}
        >
          {markdownContent}
        </Markdown>
      </div>
    );

    const htmlContent = ReactDOMServer.renderToStaticMarkup(<MarkdownComponent />);

    pdf.html(htmlContent, {
      callback: function (pdf) {
        // Fixed TypeScript error by using the correct way to get page count
        const pageCount = (pdf as any).internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(128);
          pdf.text(
            `Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
        pdf.save('patient-summary.pdf');
      },
      x: margins.left,
      y: margins.top,
      width: pageWidth - margins.left - margins.right,
      windowWidth: pageWidth - margins.left - margins.right,
      autoPaging: 'text'
    });
  };

  const handleGeneratePDF = async () => {
    if (!summary) return;
    setIsPdfGenerating(true);

    try {
      await convertMarkdownToPDF(summary);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsPdfGenerating(false);
    }
  };
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

  const downloadMarkdown = (content: string, filename: string = 'patient-summary.md') => {
    // Create blob with markdown content
    const blob = new Blob([content], { type: 'text/markdown' });
    // Create URL for the blob
    const url = window.URL.createObjectURL(blob);
    // Create temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    // Append link to body, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Clean up the URL
    window.URL.revokeObjectURL(url);
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
              <CardTitle>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={isLoading || isPdfGenerating || !summary}
                  variant="outline"
                >
                  {isPdfGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
                <Button
                  onClick={() => downloadMarkdown(summary)}
                  disabled={isLoading || !summary}
                  variant="outline"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download MD
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded">
                    <Markdown remarkPlugins={[remarkGfm]}>{summary}</Markdown>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>

                  </div>
                </>
              )}
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