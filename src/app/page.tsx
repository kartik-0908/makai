import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PatientAssessment } from '../components/patient-assessment';
import { getPatients } from '@/actions/db';
import { ClientPatientDashboard } from '@/components/patDash';

export default async function PatientAssessmentDashboard() {
  const patients = await getPatients();

  return (
    <ClientPatientDashboard initialPatients={patients} />
  );
}