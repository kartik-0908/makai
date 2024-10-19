import React from 'react';
import { getPatients } from '@/actions/db';
import { ClientPatientDashboard } from '@/components/patDash';

export default async function PatientAssessmentDashboard() {
  const patients = await getPatients();

  return (
    <ClientPatientDashboard initialPatients={patients} />
  );
}