/* eslint-disable */
'use server';
import { streamText, } from 'ai';
import { createStreamableValue } from 'ai/rsc';
import { getAssessments } from './db';
import { AssessmentWithParsedItems } from '@/components/patient-assessment';
import { azure } from '@ai-sdk/azure';
// require('dotenv').config();

type AssessmentJsonItems = Record<string, string>;

async function formatAssessmentData(patientId: string) {
  const data = await getAssessments(patientId);
  const parsedAssessments = data.map(assessment => ({
    ...assessment,
    // @ts-expect-error: items is JsonValue from Prisma but we know it's an array of JsonItem
    items: Array.isArray(assessment.items) ? assessment.items.map((item: AssessmentJsonItems) => ({
      name: item.name,
      result: item.result
    })) : []
  })) as AssessmentWithParsedItems[];

  return parsedAssessments
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(assessment => `
Assessment: ${assessment.type}
Date: ${new Date(assessment.createdAt).toLocaleDateString()}
Status: ${assessment.status}
${assessment.daysUntilDue ? `Next Due: ${assessment.daysUntilDue} days` : ''}
Measurements:
- ${assessment.items.map(item => `${item.name}: ${item.result}`).join('\n- ')}
---`).join('\n');
}
export async function generateSum(id: string) {

  const stream = createStreamableValue('');
  const data = await formatAssessmentData(id);
  const prompt = `
    Act as a nephrologist while looking at periodic assessments from CKD patients.Based on the given above data prepare a summary report about patient Only respond with summary report. Limit your summary to 100 words Summary of all the data points collected with treatment recommendations and next steps.
    
Patient Assessment History:
${data}


Please analyze this patient's assessment history and provide:
1. Overall condition progression
2. Significant changes in measurements
3. Key areas of concern


Dont include any personal information about user in your reply


    `;

  console.log(prompt);
  (async () => {
    const { textStream } = await streamText({
      model: azure('gpt-4o'),
      prompt: prompt,
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();
  return { output: stream.value };
}

export async function generateactions(id: string) {

  const stream = createStreamableValue('');
  const data = await formatAssessmentData(id);
  const prompt = `
    You are a nephrologist Youwill be given  periodic assessments from CKD patients.Based on the given above data prepare a plan for the next steps should be taken by nurse. Only respond within 100 words
    
Patient Assessment History:
${data}


Please analyze this patient's assessment history and provide:
1. Next course of action


    `;

  console.log(prompt);
  (async () => {
    const { textStream } = await streamText({
      model: azure('gpt-4o'),
      prompt: prompt,
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();
  return { output: stream.value };
}


// Patient Assesment  Report:
// {
//   "Initial Assessment": [
//     { name: "CKD Stage", result: "3" },
//     { name: "Medications", result: "Lisinopril; Furosemide; Atorvastatin" }
//   ],
//   "General Assessment": [
//     { name: "Breathlessness", result: "No" },
//     { name: "Fatigue", result: "Score: 2" },
//     { name: "Frequent Urination", result: "Score: 3" },
//     { name: "Foamy Urine", result: "Yes" },
//     { name: "Loss of Appetite", result: "No" },
//     { name: "Muscle Cramps", result: "Score: 2" },
//     { name: "Swollen Feet (Ankle Girth)", result: "28 cm" },
//     { name: "Nausea", result: "No" },
//     { name: "Itching", result: "No" },
//     { name: "Chest Pain", result: "Score: 0" },
//     { name: "Musculoskeletal Pain", result: "Score: 2" },
//     { name: "Bad Breath", result: "No" },
//     { name: "Palpitations", result: "No" },
//     { name: "Abdominal Pain", result: "Score: 0" },
//     { name: "BP", result: "135/85" },
//     { name: "Oxygen Saturation", result: "95%" },
//     { name: "Pulses", result: "85" },
//     { name: "sPo2", result: "Score: 4" },
//     { name: "GFR", result: "45" },
//     { name: "Salt Intake", result: "Moderate" },
//   ],
//   "Follow-up 1": [
//     { name: "Breathlessness", result: "No" },
//     { name: "Fatigue", result: "Score: 2" },
//     { name: "Frequent Urination", result: "Score: 3" },
//     { name: "Foamy Urine", result: "Yes" },
//     { name: "Loss of Appetite", result: "No" },
//     { name: "Muscle Cramps", result: "Score: 2" },
//     { name: "Swollen Feet (Ankle Girth)", result: "28 cm" },
//     { name: "Nausea", result: "No" },
//     { name: "Itching", result: "No" },
//     { name: "Chest Pain", result: "Score: 0" },
//     { name: "Musculoskeletal Pain", result: "Score: 2" },
//     { name: "Bad Breath", result: "No" },
//     { name: "Palpitations", result: "No" },
//     { name: "Abdominal Pain", result: "Score: 0" },
//     { name: "BP", result: "135/85" },
//     { name: "Oxygen Saturation", result: "95%" },
//     { name: "Pulses", result: "85" },
//     { name: "sPo2", result: "Score: 4" },
//     { name: "GFR", result: "45" },
//     { name: "Salt Intake", result: "Moderate" },
//   ],
//   "Follow-up 2": [
//     { name: "Breathlessness", result: "No" },
//     { name: "Fatigue", result: "Score: 3" },
//     { name: "Frequent Urination", result: "Score: 3" },
//     { name: "Foamy Urine", result: "Yes" },
//     { name: "Loss of Appetite", result: "Yes" },
//     { name: "Muscle Cramps", result: "Score: 3" },
//     { name: "Swollen Feet (Ankle Girth)", result: "29 cm" },
//     { name: "Nausea", result: "No" },
//     { name: "Itching", result: "No" },
//     { name: "Chest Pain", result: "Score: 0" },
//     { name: "Musculoskeletal Pain", result: "Score: 3" },
//     { name: "Bad Breath", result: "No" },
//     { name: "Palpitations", result: "Yes" },
//     { name: "Abdominal Pain", result: "Score: 0" },
//     { name: "BP", result: "130/82" },
//     { name: "Oxygen Saturation", result: "93%" },
//     { name: "Pulses", result: "88" },
//     { name: "sPo2", result: "Score: 3" },
//     { name: "GFR", result: "43" },
//     { name: "Salt Intake", result: "Moderate" },
//   ],
//   "Follow-up 3": [
//     { name: "Breathlessness", result: "Yes" },
//     { name: "Fatigue", result: "Score: 4" },
//     { name: "Frequent Urination", result: "Score: 2" },
//     { name: "Foamy Urine", result: "Yes" },
//     { name: "Loss of Appetite", result: "Yes" },
//     { name: "Muscle Cramps", result: "Score: 4" },
//     { name: "Swollen Feet (Ankle Girth)", result: "30 cm" },
//     { name: "Nausea", result: "Yes" },
//     { name: "Itching", result: "Yes" },
//     { name: "Chest Pain", result: "Score: 0" },
//     { name: "Musculoskeletal Pain", result: "Score: 4" },
//     { name: "Bad Breath", result: "Yes" },
//     { name: "Palpitations", result: "Yes" },
//     { name: "Abdominal Pain", result: "Score: 0" },
//     { name: "BP", result: "140/90" },
//     { name: "Oxygen Saturation", result: "92%" },
//     { name: "Pulses", result: "90" },
//     { name: "sPo2", result: "Score: 2" },
//     { name: "GFR", result: "40" },
//     { name: "Salt Intake", result: "High" },
//   ],
// };