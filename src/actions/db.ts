// app/actions.ts
'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getPatients() {
    return await prisma.patient.findMany({
        orderBy: { createdAt: 'desc' }
    });
}

export async function getAssessments(patientId: string) {
    const res =  await prisma.assessment.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' }
    })
    console.log(res)
    return res;
}