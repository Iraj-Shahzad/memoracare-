import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Auth API', () => {
  const patient = { name: 'Test Patient', email: 'patient@test.com', password: 'password123', role: 'patient' };

  it('registers a new patient and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(patient);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('patient');
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(patient);
    const res = await request(app).post('/api/auth/register').send(patient);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(patient);
    const res = await request(app).post('/api/auth/login').send({ email: patient.email, password: patient.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects login with a wrong password', async () => {
    await request(app).post('/api/auth/register').send(patient);
    const res = await request(app).post('/api/auth/login').send({ email: patient.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send(patient);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(patient.email);
    expect(res.body.profile).not.toBeNull(); // a Patient profile was created
  });

  it('blocks /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
