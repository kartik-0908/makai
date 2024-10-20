'use client'
import { useState } from 'react';
import { Patient } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PatientAssessment } from './patient-assessment';

export function ClientPatientDashboard({ initialPatients }: { initialPatients: Patient[] }) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Patient Assessment Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {!selectedPatient ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialPatients.map((patient) => (
              <Card 
                key={patient.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedPatient(patient)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    {patient.imageUrl && (
                      <img
                        src={patient.imageUrl}
                        alt={`${patient.name}'s photo`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">{patient.name}</h3>
                      <p className="text-sm text-gray-500">ID: {patient.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <button 
              onClick={() => setSelectedPatient(null)}
              className="mb-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Patient List
            </button>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Patient Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 pb-8">
                  <div className="col-span-1">
                    {selectedPatient.imageUrl && (
                      <img
                        src={selectedPatient.imageUrl}
                        alt={`${selectedPatient.name}'s photo`}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="mt-1 text-lg font-semibold">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Age</p>
                    <p className="mt-1 text-lg font-semibold">{selectedPatient.age}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Gender</p>
                    <p className="mt-1 text-lg font-semibold">{selectedPatient.gender}</p>
                  </div>
                </div>
                <PatientAssessment patientId={selectedPatient.id} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}