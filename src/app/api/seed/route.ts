import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const adminEmail = 'admin@test.com';
    const adminPassword = 'test1234';
    const clientEmail = 'client@test.com';
    const clientPassword = 'test1234';

    let adminUid: string;
    try {
      const u = await adminAuth.getUserByEmail(adminEmail);
      adminUid = u.uid;
    } catch {
      const u = await adminAuth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: 'Wedding Planner',
        emailVerified: true,
      });
      adminUid = u.uid;
    }

    let clientUid: string;
    try {
      const u = await adminAuth.getUserByEmail(clientEmail);
      clientUid = u.uid;
    } catch {
      const u = await adminAuth.createUser({
        email: clientEmail,
        password: clientPassword,
        displayName: 'Sophie',
        emailVerified: true,
      });
      clientUid = u.uid;
    }

    await adminAuth.setCustomUserClaims(adminUid, { role: 'vendor', vendorType: 'Photographes' });
    await adminAuth.setCustomUserClaims(clientUid, { role: 'client' });

    await adminDb.collection('profiles').doc(adminUid).set(
      {
        uid: adminUid,
        email: adminEmail,
        name: 'Atelier Lumière',
        role: 'vendor',
        vendorType: 'Photographes',
        created_at: new Date().toISOString(),
      },
      { merge: true }
    );

    await adminDb.collection('profiles').doc(clientUid).set(
      {
        uid: clientUid,
        email: clientEmail,
        name: 'Sophie',
        partner: 'Thomas',
        role: 'client',
        created_at: new Date().toISOString(),
      },
      { merge: true }
    );

    // Create a CRM client doc linked to the Firebase auth uid
    const clientsRef = adminDb.collection('clients');
    const existingClient = await clientsRef.where('uid', '==', clientUid).limit(1).get();
    let clientDocId: string;
    if (existingClient.empty) {
      const docRef = await clientsRef.add({
        uid: clientUid,
        planner_id: adminUid,
        email: clientEmail,
        name: 'Sophie',
        partner: 'Thomas',
        phone: '0612345678',
        event_date: '2026-09-15',
        budget: 35000,
        guest_count: 120,
        status: 'active',
        created_at: new Date().toISOString(),
        theme_style: 'Champêtre chic',
        theme_colors: ['#E7CBA9', '#2EC4B6', '#4B1D6B'],
        moodboard_images: [],
        progress: 35,
      });
      clientDocId = docRef.id;
    } else {
      clientDocId = existingClient.docs[0].id;
    }

    // Create an event linked to CRM client doc
    const eventsRef = adminDb.collection('events');
    const existingEvent = await eventsRef.where('client_id', '==', clientDocId).limit(1).get();
    let eventId: string;
    if (existingEvent.empty) {
      const evRef = await eventsRef.add({
        client_id: clientDocId,
        planner_id: adminUid,
        couple_names: 'Sophie & Thomas',
        event_date: '2026-09-15',
        venue: 'Château de la Mariée',
        location: 'Paris',
        guest_count: 120,
        budget: 35000,
        spent: 12000,
        status: 'in_progress',
        created_at: new Date().toISOString(),
        progress: 35,
        theme_style: 'Champêtre chic',
        theme_colors: ['#E7CBA9', '#2EC4B6', '#4B1D6B'],
        moodboard_images: [],
        reference: 'EVT-TEST-001',
      });
      eventId = evRef.id;
    } else {
      eventId = existingEvent.docs[0].id;
    }

    // Seed a few milestones/tasks
    const tasksRef = adminDb.collection('tasks');
    const existingTasks = await tasksRef.where('event_id', '==', eventId).limit(1).get();
    if (existingTasks.empty) {
      await tasksRef.add({
        event_id: eventId,
        kind: 'milestone',
        title: 'Choix du lieu',
        deadline: '2026-03-30',
        admin_confirmed: true,
        client_confirmed: false,
        created_at: new Date().toISOString(),
      });
      await tasksRef.add({
        event_id: eventId,
        kind: 'milestone',
        title: 'Choix du traiteur',
        deadline: '2026-04-15',
        admin_confirmed: false,
        client_confirmed: false,
        created_at: new Date().toISOString(),
      });
    }

    // Seed invoices/payments
    const invoicesRef = adminDb.collection('invoices');
    const existingInvoices = await invoicesRef.where('client_id', '==', clientDocId).limit(1).get();
    if (existingInvoices.empty) {
      await invoicesRef.add({
        client_id: clientDocId,
        description: 'Acompte Château',
        vendor: 'Château de la Mariée',
        amount: 2000,
        status: 'paid',
        date: '2026-01-15',
        created_at: new Date().toISOString(),
      });
      await invoicesRef.add({
        client_id: clientDocId,
        description: 'Acompte Traiteur',
        vendor: 'Traiteur Délice',
        amount: 1500,
        status: 'pending',
        due_date: '2026-04-20',
        created_at: new Date().toISOString(),
      });
    }

    // Seed devis
    const devisRef = adminDb.collection('devis');
    const existingDevis = await devisRef.where('client_id', '==', clientDocId).limit(1).get();
    if (existingDevis.empty) {
      await devisRef.add({
        client_id: clientDocId,
        client_email: clientEmail,
        reference: 'DEV-TEST-001',
        status: 'sent',
        amount: 4200,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Seed conversation
    const convRef = adminDb.collection('conversations');
    const existingConv = await convRef.where('client_id', '==', clientDocId).limit(1).get();
    let conversationId: string;
    if (existingConv.empty) {
      const c = await convRef.add({
        client_id: clientDocId,
        client_name: 'Sophie & Thomas',
        planner_id: adminUid,
        last_message: 'Bienvenue sur LeOui !',
        last_message_at: new Date().toISOString(),
        unread_count_client: 1,
        unread_count_planner: 0,
        created_at: new Date().toISOString(),
      });
      conversationId = c.id;
    } else {
      conversationId = existingConv.docs[0].id;
    }

    return NextResponse.json({
      ok: true,
      admin: { email: adminEmail, password: adminPassword, uid: adminUid },
      client: { email: clientEmail, password: clientPassword, uid: clientUid },
      firestore: {
        clientDocId,
        eventId,
        conversationId,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || String(error),
        stack: error?.stack || null,
      },
      { status: 500 }
    );
  }
}
