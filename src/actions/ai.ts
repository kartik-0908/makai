/* eslint-disable */
'use server';
import { streamText, } from 'ai';
import { createStreamableValue } from 'ai/rsc';
import { getAssessments } from './db';
import { AssessmentWithParsedItems } from '@/components/patient-assessment';
import { azure } from '@ai-sdk/azure';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
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
  const ckdprompt = `
    Act as a nephrologist while looking at periodic assessments from CKD patients.Based on the given above data prepare a summary report about patient Only respond with summary report. Limit your summary to 200 words Summary of all the data points collected with treatment recommendations and next steps.
    
Patient Assessment History:
${data}


Please analyze this patient's assessment history and provide:
1. Overall condition progression
2. Significant changes in measurements
3. Key areas of concern


Dont include any personal information about user in your reply

Soem of the example of summary report:

This patient has chronic kidney disease (CKD) and is being
managed with a combination of medications, including
Telmisartan (an antihypertensive) and Lasix (a diuretic).
Here’s a breakdown of the clinical findings and their
interpretation based on the timeline in the document:
1. **Initial Condition (09/01/2024 - 09/07/2024)**:
- The patient started with relatively stable blood pressure
readings (135/80 mmHg initially, rising to 147/99 mmHg).
- Ankle girth measurements indicate mild fluid retention,
with a gradual increase from 12.1 to 12.7 inches over a week,
suggesting worsening edema.
- The breathlessness scale also worsened, from 1/10 to
5/10, likely due to fluid overload.
2. **Dose Adjustment (Lasix Increased to 80 mg daily)**:
- After increasing Lasix on 09/07/2024, the patient’s
condition started to improve:
- Blood pressure gradually reduced from 145/96 mmHg
to 135/85 mmHg.

- Ankle girth decreased from 12.6 to 11 inches, reflecting a
reduction in fluid retention.
- Breathlessness improved, but muscle spasms and
palpitations emerged as new symptoms. These side effects
could be due to electrolyte imbalances (particularly
potassium) caused by the higher dose of Lasix, which is
known to cause hypokalemia.
3. **Addition of Spironolactone (09/14/2024 -
10/05/2024)**:
- Spironolactone, a potassium-sparing diuretic, was
added to manage the side effects and further control fluid
overload.
- Blood pressure remained stable at 120-124/80 mmHg.
- Ankle girth stabilized at 10.7 inches, suggesting good
control of edema.
- Palpitations and muscle spasms persisted
intermittently, and chest pain was noted on 10/05/2024,
which warrants further evaluation, as it could indicate a
cardiovascular issue, particularly in a CKD patient.
 Key Interpretations:
- The patient initially experienced worsening fluid
overload, which was well-controlled with increased Lasix.
- However, the introduction of higher doses of diuretics led
to symptoms suggestive of electrolyte imbalances (muscle
spasms, palpitations).

- The addition of spironolactone helped to stabilize the fluid
overload but did not completely resolve the side effects
(palpitations and chest pain).
- Close monitoring of electrolyte levels, particularly
potassium and magnesium, is essential, as CKD patients are
prone to fluctuations in these levels, especially with diuretics.
- The chest pain on 10/05/2024 could indicate a more serious
underlying condition (e.g., electrolyte imbalance-induced
arrhythmia or ischemic heart disease), which needs further
investigation.


Strictly only mention the above data which is available and do not mention any other information.


    `;
  const htprompt = `

act as a physician and summarize all the health data for hypertensive patients and also do any course corrections to the treatment plan if required.

While answering dont use any symbols like #####

Patient Assessment History:
${data}

Some of the example of summary report:

Patient Profile:

Diagnosed with Stage 2 Hypertension (BP consistently above 160/100 mmHg)
Type 2 Diabetes (HbA1c: 7.5%)
Dyslipidemia
Smoker (20 years)
No known renal issues or other cardiovascular diseases yet, but at high risk due to comorbidities.
Initial Visit:
Blood Pressure: 165/105 mmHg
Current Symptoms: Mild headaches, fatigue
Labs: Normal kidney function, mild elevation in creatinine, mild proteinuria
Treatment Plan:

Lifestyle Changes:

DASH diet: Low sodium, increase potassium, lean proteins.
Weight loss goal.
Smoking cessation.
Moderate exercise: 30 minutes daily.
Medication:

Losartan 50 mg once daily (Angiotensin II Receptor Blocker - ARB).
Amlodipine 5 mg once daily (Calcium Channel Blocker - CCB).
Second Visit (Day 3):
Blood Pressure: 160/100 mmHg
Symptoms: Mild headaches continue, less frequent.
Assessment: Initial response is insufficient; BP still elevated.

Adjustment to Treatment:

Increase Losartan to 100 mg once daily.
Increase Amlodipine to 10 mg once daily.
Reinforce lifestyle changes, especially sodium intake.
Third Visit (Day 6):
Blood Pressure: 155/98 mmHg
Symptoms: Headaches subsiding, reports some leg swelling (possible side effect of Amlodipine).
Labs: No significant changes.

Assessment: BP continues to be above target.

Adjustment to Treatment:

Add Hydrochlorothiazide (HCTZ) 12.5 mg once daily (Thiazide diuretic to reduce volume and aid in BP control).
Continue Losartan 100 mg and Amlodipine 10 mg.
Monitor for possible electrolyte disturbances due to diuretic.
Fourth Visit (Day 9):
Blood Pressure: 148/92 mmHg
Symptoms: Noticeable improvement in headaches, mild dizziness on standing, increased urination.
Labs: No significant abnormalities, electrolytes stable.

Assessment: BP still not fully controlled but improving with the addition of diuretic.

Adjustment to Treatment:

Increase HCTZ to 25 mg once daily.
Continue Losartan 100 mg and Amlodipine 10 mg.
Encourage continued adherence to diet and exercise.
Fifth Visit (Day 12):
Blood Pressure: 142/88 mmHg
Symptoms: Mild fatigue, overall feeling better, leg swelling has reduced.
Assessment: BP closer to target, good response to increased diuretic dose.

Adjustment to Treatment:

Add Metoprolol Succinate 25 mg once daily (Beta-blocker to help reduce BP further and control heart rate).
Monitor for any signs of bradycardia or excessive fatigue.
Sixth Visit (Day 15):
Blood Pressure: 138/85 mmHg
Symptoms: Feeling significantly better, mild fatigue but no headaches or dizziness.
Assessment: BP within near-optimal range, patient responding well to adjustments.

Adjustment to Treatment:

Maintain current doses of Losartan 100 mg, Amlodipine 10 mg, HCTZ 25 mg, and Metoprolol Succinate 25 mg.
No new medications needed at this stage.
Encourage continued compliance with lifestyle changes, focus on exercise and weight loss.
Seventh Visit (Day 18):
Blood Pressure: 130/82 mmHg
Symptoms: No significant complaints, patient reports better energy levels and overall improvement in quality of life.
Assessment: BP now within target range, significant improvement in symptoms. The patient is responding well to the combined therapy.

Final Treatment Plan:

Losartan 100 mg once daily.
Amlodipine 10 mg once daily.
Hydrochlorothiazide 25 mg once daily.
Metoprolol Succinate 25 mg once daily.
Continue monitoring BP, electrolytes, and kidney function every few months.
Summary of Drug Adjustments (3-day intervals):
Day 0: Started on Losartan 50 mg and Amlodipine 5 mg.
Day 3: Increased Losartan to 100 mg and Amlodipine to 10 mg.
Day 6: Added HCTZ 12.5 mg.
Day 9: Increased HCTZ to 25 mg.
Day 12: Added Metoprolol 25 mg.
Day 15: Maintained doses.
Day 18: BP controlled, maintained current therapy.
This accelerated timeline shows early intervention and gradual, effective control of hypertension with frequent adjustments, leading to an improvement in BP within two weeks.
[1:10 am, 23/10/2024] Manav: Course of Treatment and Observations over 18 Days:
Initial Medications:

Lisinopril 10 mg once daily (ACE Inhibitor for BP control and kidney protection).
Amlodipine 5 mg once daily (Calcium Channel Blocker to manage hypertension).
Patient Progress:

Day 6: BP improved slightly to 160/100 mmHg, headaches reduced but still present.
Day 9: BP further improved to 152/95 mmHg, slight leg swelling due to Amlodipine, renal function stable, mild hyponatremia noted.
Day 12: BP continued to drop to 145/92 mmHg, headaches almost resolved, leg swelling reduced. Labs showed mild hyponatremia and a slight elevation in potassium, likely related to the use of Lisinopril and diuretics.
Suggested Adjustment on Day 18:
Current BP: 130/80 mmHg
Symptoms: No major complaints, significant improvement in headaches, no further chest tightness, mild fatigue but improved overall well-being.
Labs: Kidney function stable (eGFR unchanged), sodium levels improving but still mildly low, potassium stable.
Treatment Adjustment on Day 18:
Maintain current doses of:

Lisinopril 20 mg once daily (kidney protection and BP control).
Amlodipine 10 mg once daily (maintain BP control without causing further edema).
Reduce Chlorthalidone to 12.5 mg once daily if still on a higher dose, as the risk of worsening hyponatremia is present with continued diuretic use, especially given the patient's CKD.

Continue Metoprolol Tartrate 25 mg twice daily (help with BP and occasional chest tightness, monitor for any fatigue or bradycardia).

Monitor electrolyte levels (sodium and potassium), renal function, and BP closely:

Electrolytes: Due to the risk of hyponatremia from Chlorthalidone and hyperkalemia from Lisinopril, continue to check these every 1-2 weeks.
Kidney function: Given the underlying CKD, ensure no rapid worsening occurs due to medications.
Encourage further lifestyle changes:

Continue sodium restriction (<1,500 mg/day).
Encourage weight loss and physical activity within the patient’s tolerance due to osteoarthritis.
Final Notes:
On Day 18, the patient's BP is controlled at 130/80 mmHg, and symptoms are well-managed. The focus now shifts to maintaining BP control, minimizing the risk of electrolyte disturbances, and closely monitoring kidney function due to the combined effects of antihypertensive therapy and the patient's CKD.




`;
const patient = await prisma.patient.findUnique({ where: { id } });

  (async () => {

    const { textStream } = await streamText({
      model: azure('gpt-4o'),
      prompt: patient?.disease === 'CKD' ? ckdprompt : htprompt,
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
    You are a nephrologist Youwill be given  periodic assessments from CKD patients.Based on the given above data prepare a plan for the next steps should be taken by nurse. Only respond within 200 words
    
Patient Assessment History:
${data}


Please analyze this patient's assessment history and provide:
1. Next course of action

Strictly only mention the above data which is available and do not mention any other information which is undefined or null.


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