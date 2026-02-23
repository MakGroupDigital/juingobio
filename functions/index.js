const functions = require('firebase-functions/v1');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const statusLabel = (status) => {
  if (status === 'pending') return 'en attente';
  if (status === 'processing') return 'en traitement';
  if (status === 'delivering') return 'en livraison';
  if (status === 'completed') return 'livree';
  return status || 'mise a jour';
};

const transactionStatusLabel = (status) => {
  if (status === 'pending') return 'en attente';
  if (status === 'approved') return 'approuvee';
  if (status === 'paid') return 'payee';
  if (status === 'failed') return 'echouee';
  if (status === 'refunded') return 'remboursee';
  if (status === 'cancelled') return 'annulee';
  return status || 'mise a jour';
};

const getUserTokens = async (uid) => {
  if (!uid) return { webToken: null, androidToken: null };
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  if (!userSnap.exists) return { webToken: null, androidToken: null };
  const user = userSnap.data() || {};
  return {
    webToken: typeof user?.push_tokens?.web_fcm === 'string' ? user.push_tokens.web_fcm : null,
    androidToken: typeof user?.push_tokens?.android_fcm === 'string' ? user.push_tokens.android_fcm : null
  };
};

const sendPushToUser = async (uid, payload) => {
  const { webToken, androidToken } = await getUserTokens(uid);
  if (!webToken && !androidToken) {
    logger.info(`No push token found for ${uid}`);
    return;
  }

  const messages = [];
  if (webToken) {
    messages.push({
      token: webToken,
      notification: { title: payload.title, body: payload.body },
      data: {
        ...payload.data,
        url: payload.link || '/'
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png'
        },
        fcmOptions: { link: payload.link || '/' }
      }
    });
  }
  if (androidToken) {
    messages.push({
      token: androidToken,
      notification: { title: payload.title, body: payload.body },
      data: {
        ...payload.data,
        route: payload.route || 'orders'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default'
        }
      }
    });
  }

  try {
    const result = await admin.messaging().sendEach(messages);
    logger.info(`Push sent to user ${uid}`, result);
  } catch (error) {
    logger.error('FCM send failed', error);
    const code = error?.errorInfo?.code || '';
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      const cleanup = {};
      if (webToken) cleanup.web_fcm = admin.firestore.FieldValue.delete();
      if (androidToken) cleanup.android_fcm = admin.firestore.FieldValue.delete();
      await admin.firestore().doc(`users/${uid}`).set({ push_tokens: cleanup }, { merge: true });
      logger.info(`Invalid token removed for user ${uid}`);
    }
  }
};

exports.onOrderStatusChanged = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
  const before = change.before?.data();
  const after = change.after?.data();
  const orderId = context.params.orderId;

  if (!before || !after) return;
  if (before.status === after.status) return;
  if (!after.user_id) return;

  const title = 'Mise a jour commande';
  const body = `Commande #${orderId}: ${statusLabel(after.status)}`;
  await sendPushToUser(after.user_id, {
    title,
    body,
    link: '/orders',
    route: 'orders',
    data: {
      orderId: String(orderId),
      status: String(after.status || '')
    }
  });
});

exports.onTransactionCreated = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data() || {};
    const transactionId = context.params.transactionId;
    if (!data.user_id) return;

    const amount = Number(data.amount || 0).toFixed(2);
    const currency = data.currency || 'CDF';
    const title = 'Nouvelle transaction';
    const body = `Transaction #${transactionId}: ${amount} ${currency}`;

    await sendPushToUser(data.user_id, {
      title,
      body,
      link: '/orders',
      route: 'orders',
      data: {
        transactionId: String(transactionId),
        status: String(data.status || '')
      }
    });
  });

exports.onTransactionUpdated = functions.firestore
  .document('transactions/{transactionId}')
  .onUpdate(async (change, context) => {
    const before = change.before?.data();
    const after = change.after?.data();
    const transactionId = context.params.transactionId;
    if (!before || !after || !after.user_id) return;
    if (before.status === after.status) return;

    const title = 'Transaction mise a jour';
    const body = `Transaction #${transactionId}: ${transactionStatusLabel(after.status)}`;

    await sendPushToUser(after.user_id, {
      title,
      body,
      link: '/orders',
      route: 'orders',
      data: {
        transactionId: String(transactionId),
        status: String(after.status || '')
      }
    });
  });
