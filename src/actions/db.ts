// app/actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient()

export async function getPatients() {
    revalidatePath('/')

    return await prisma.patient.findMany({
        orderBy: { createdAt: 'desc' }
    });
}

export async function getAssessments(patientId: string) {
    const res =  await prisma.assessment.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' }
    })
    // console.log(res)
    return res;
}