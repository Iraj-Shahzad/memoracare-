import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import Patient from '../models/Patient';
import { canAccessPatient } from '../utils/access';

const app = createApp();

// Register a user through the API and return its token + user id.
async function registerUser(role: string, email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: email, email, password: 'password123', role });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

async function patientIdFor(userId: string) {
  const patient = await Patient.findOne({ user: userId });
  return patient!._id.toString();
}

describe('canAccessPatient (unit)', () => {
  it('lets a patient access their own record but not another patient', async () => {
    const p1 = await registerUser('patient', 'own1@test.com');
    const p2 = await registerUser('patient', 'own2@test.com');
    const pid1 = await patientIdFor(p1.userId);
    const pid2 = await patientIdFor(p2.userId);

    expect(await canAccessPatient({ id: p1.userId, role: 'patient' }, pid1)).toBe(true);
    expect(await canAccessPatient({ id: p1.userId, role: 'patient' }, pid2)).toBe(false);
  });

  it('lets a caregiver access only assigned patients', async () => {
    const cg = await registerUser('caregiver', 'carer1@test.com');
    const p1 = await registerUser('patient', 'asg1@test.com');
    const p2 = await registerUser('patient', 'asg2@test.com');
    const pid1 = await patientIdFor(p1.userId);
    const pid2 = await patientIdFor(p2.userId);

    const patient1 = await Patient.findById(pid1);
    patient1!.assignedCaregivers = [cg.userId as any];
    await patient1!.save();

    expect(await canAccessPatient({ id: cg.userId, role: 'caregiver' }, pid1)).toBe(true);
    expect(await canAccessPatient({ id: cg.userId, role: 'caregiver' }, pid2)).toBe(false);
  });

  it('lets an admin access any patient', async () => {
    const p1 = await registerUser('patient', 'adm1@test.com');
    const pid1 = await patientIdFor(p1.userId);
    const fakeAdminId = new mongoose.Types.ObjectId().toString();
    expect(await canAccessPatient({ id: fakeAdminId, role: 'admin' }, pid1)).toBe(true);
  });
});

describe('Medication access control (integration)', () => {
  it('403s a caregiver reading a patient they are not assigned to', async () => {
    const cg = await registerUser('caregiver', 'carer2@test.com');
    const p = await registerUser('patient', 'med1@test.com');
    const pid = await patientIdFor(p.userId);

    const res = await request(app)
      .get(`/api/medications/patient/${pid}`)
      .set('Authorization', `Bearer ${cg.token}`);
    expect(res.status).toBe(403);
  });

  it('lets a patient read their own medications', async () => {
    const p = await registerUser('patient', 'med2@test.com');
    const pid = await patientIdFor(p.userId);

    const res = await request(app)
      .get(`/api/medications/patient/${pid}`)
      .set('Authorization', `Bearer ${p.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.medications)).toBe(true);
  });

  it('blocks a patient from creating a medication (caregiver/admin only)', async () => {
    const p = await registerUser('patient', 'med3@test.com');
    const pid = await patientIdFor(p.userId);

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${p.token}`)
      .send({ patient: pid, name: 'Test', dosage: '10mg' });
    expect(res.status).toBe(403);
  });

  it('lets an assigned caregiver create a medication', async () => {
    const cg = await registerUser('caregiver', 'carer3@test.com');
    const p = await registerUser('patient', 'med4@test.com');
    const pid = await patientIdFor(p.userId);

    const patient = await Patient.findById(pid);
    patient!.assignedCaregivers = [cg.userId as any];
    await patient!.save();

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${cg.token}`)
      .send({ patient: pid, name: 'Aricept', dosage: '10mg', times: ['09:00'] });
    expect(res.status).toBe(201);
    expect(res.body.medication.name).toBe('Aricept');
  });
});
