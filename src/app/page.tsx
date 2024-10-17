import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PatientAssessment } from '../components/patient-assessment';
import Image from 'next/image';

const patientDetails = {
  name: "John Doe",
  age: 45,
  gender: "Male",
  patientId: "P12345",
  lastVisit: "2023-05-15",
  imageUrl: "https://github.com/shadcn.png"
};

export default function PatientAssessmentDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Patient Assessment Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Patient Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 pb-8">
              <div className="col-span-1">
                <Image
                  src={patientDetails.imageUrl}
                  alt={`${patientDetails.name}'s photo`}
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1 text-lg font-semibold">{patientDetails.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Age</p>
                <p className="mt-1 text-lg font-semibold">{patientDetails.age}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Gender</p>
                <p className="mt-1 text-lg font-semibold">{patientDetails.gender}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Patient ID</p>
                <p className="mt-1 text-lg font-semibold">{patientDetails.patientId}</p>
              </div>
            </div>
            <PatientAssessment />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
