/* eslint-disable */
'use server';
import { generateText, streamText, } from 'ai';
import { createStreamableValue } from 'ai/rsc';
import { getAssessments } from './db';
import { AssessmentWithParsedItems } from '@/components/patient-assessment';
import { azure } from '@ai-sdk/azure';
import { PrismaClient } from '@prisma/client'
import { openai } from '@ai-sdk/openai';



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

This information will be provided to professional healthcare providers and will be used to develop a personalized treatment plan for the patient, So do not mention any disclaimer.


    `;
  const patient = await prisma.patient.findUnique({ where: { id } });

  const htprompt = `

act as a physician and summarize all the health data for hypertensive patients and also do any course corrections to the treatment plan if required. Before suggesting any medicines, check contraindications and interactions and point them out.

Patient personal information:

patient name: ${patient?.name}
patient age: ${patient?.age}
patient gender: ${patient?.gender}

Patient Assessment History:
${data}

Some of the example of summary report:



Patient Summary Example:


# **Patient Summary Example**

## **Patient Information:**
- **Patient ID**: 12345
- **Age**: 58
- **Sex**: Male
- **Start of Monitoring**: 2023-08-01
- **Total Assessments**: 5

---

## **Chronic Conditions:**
- **Hypertension**
- **Dyslipidemia**
- **Type 2 Diabetes Mellitus**
- **Chronic Kidney Disease (Stage 2)**

---

## **Current Medications:**
- **Lisinopril (ACE inhibitor)**: 10 mg daily
- **Atorvastatin**: 20 mg daily
- **Metformin**: 500 mg twice daily
- **Amlodipine**: 5 mg daily

---

## **1. Blood Pressure (BP) Trend Analysis**

| **Date**       | **Systolic/Diastolic** | **Trend**  | **Possible Cause** |
|----------------|------------------------|------------|--------------------|
| 2023-08-01     | 140/90                 | Upward     | Missed morning medication, high salt intake. |
| 2023-08-05     | 145/92                 | Upward     | Increased stress, possible fluid retention.  |
| 2023-08-10     | 142/88                 | Downward   | Resumed regular antihypertensive dose.       |
| 2023-08-15     | 138/85                 | Downward   | Reduced salt intake, increased physical activity. |
| 2023-08-20     | 145/90                 | Upward     | High salt intake during social events, skipped medication. |

**Summary**: The patient's BP initially showed an upward trend due to missed medication doses and high sodium intake. After resuming medications and reducing sodium, BP improved temporarily but spiked again after social events involving salt-rich food and skipped medication.

---

## **2. Other Vital Signs (Datewise)**

| **Date**       | **Vital Sign** | **Reading** | **Trend**  | **Possible Cause** |
|----------------|----------------|-------------|------------|--------------------|
| 2023-08-01     | Heart Rate      | 80 bpm      | Stable     | Normal heart rate, no abnormalities. |
| 2023-08-05     | Weight          | 85 kg       | Upward     | Possible fluid retention, lack of exercise. |
| 2023-08-10     | Weight          | 84.5 kg     | Downward   | Limited fluid intake and low-sodium diet. |
| 2023-08-15     | Oxygen Saturation | 97%       | Stable     | No respiratory issues, normal reading. |
| 2023-08-20     | Weight          | 86 kg       | Upward     | Fluid retention due to high salt intake. |

**Summary**: The patient’s weight fluctuated due to fluid retention likely caused by high salt intake. Oxygen saturation and heart rate remained stable, indicating no immediate respiratory or cardiac issues.

---

## **3. Symptom Tracking**

| **Symptom**     | **Date Range**          | **Frequency** | **Most Likely Cause** |
|-----------------|-------------------------|---------------|-----------------------|
| Chest Pain      | 2023-08-05 to 2023-08-10 | 3 occurrences | Uncontrolled BP, physical exertion. |
| Blurry Vision   | 2023-08-08 to 2023-08-10 | 2 occurrences | Elevated BP, potential hypertensive retinopathy. |
| Palpitations    | 2023-08-15 to 2023-08-20 | 1 occurrence  | Anxiety, occasional missed medication. |

**Summary**: Chest pain occurred during periods of uncontrolled BP and exertion. Blurry vision was noted during periods of high BP, indicating potential hypertensive damage to the eyes. Palpitations were sporadic, likely due to anxiety and missed doses of antihypertensives.

---

## **4. Corrective Steps and Recommendations**

| **Corrective Action**            | **Reason for Recommendation** |
|----------------------------------|-------------------------------|
| Increase ACE inhibitor dose      | BP remains elevated despite current medication dosage. |
| Limit fluid intake to 1.5L/day   | Signs of fluid retention (weight gain). |
| Restrict sodium intake to <2g/day | High sodium intake linked to elevated BP and weight gain. |
| Increase physical activity       | Moderate exercise to improve BP control and fluid balance. |
| Consider diuretic prescription   | If weight and BP remain elevated due to fluid retention. |
| Refer to ophthalmologist         | Due to recurring blurry vision, potential hypertensive retinopathy risk. |

**Summary**: To better control BP, the patient’s antihypertensive medication dosage should be increased, fluid intake should be limited, and sodium intake should be reduced. If fluid retention continues, consider prescribing a diuretic. The patient should also be referred to an ophthalmologist to rule out any retinopathy due to high BP.

---

## **5. Long-Term Management Plan**

| **Long-Term Action**               | **Explanation** |
|------------------------------------|-----------------|
| Weekly BP checks                   | Regular monitoring to ensure BP control. |
| Monthly renal function tests        | To check for any kidney damage due to hypertension. |
| Daily exercise recommendation       | 30 minutes of moderate activity to support BP and weight management. |
| Sodium intake logs                  | Daily sodium intake should be tracked and reduced. |
| Remote BP monitoring device         | Real-time BP tracking to avoid medication lapses. |
| Referral to cardiologist            | If chest pain and BP continue to be uncontrolled. |

**Summary**: The patient should follow a long-term management plan that includes regular BP monitoring, tracking sodium intake, and daily exercise. A referral to a cardiologist is recommended if symptoms persist.

---

## **6. Summary Conclusion**

The patient's blood pressure has been fluctuating due to missed medication doses and lifestyle factors, such as high sodium intake. Chest pain and blurry vision are warning signs of uncontrolled BP, placing the patient at risk of cardiovascular events and hypertensive retinopathy. Immediate actions include increasing the antihypertensive medication dose, reducing sodium and fluid intake, and adopting a consistent exercise routine. A cardiologist and ophthalmologist should evaluate the patient due to the recurring symptoms.


`;

  (async () => {
    const { text } = await generateText({
      model: openai('o1'),
      prompt: patient?.disease === 'CKD' ? ckdprompt : htprompt,
      providerOptions: {
        openai: {
          reasoningEffort: 'high',
        },
      },
    });

    for await (const delta of text) {
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

  // console.log(prompt);
  (async () => {
    const { textStream } = await streamText({
      model: azure('gpt-4o'),
      prompt: prompt,
    });

    for await (const delta of textStream) {
      console.log(delta)
      stream.update(delta);
    }

    stream.done();
  })();
  return { output: stream.value };
}
