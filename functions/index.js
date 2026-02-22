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

exports.onOrderStatusChanged = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
  const before = change.before?.data();
  const after = change.after?.data();
  const orderId = context.params.orderId;

  if (!before || !after) return;
  if (before.status === after.status) return;
  if (!after.user_id) return;

  const userSnap = await admin.firestore().doc(`users/${after.user_id}`).get();
  if (!userSnap.exists) {
    logger.warn(`No user doc for ${after.user_id}`);
    return;
  }

  const user = userSnap.data() || {};
  const webToken = user?.push_tokens?.web_fcm;
  if (!webToken || typeof webToken !== 'string') {
    logger.info(`No web_fcm token found for ${after.user_id}`);
    return;
  }

  const title = 'Mise a jour commande';
  const body = `Commande #${orderId}: ${statusLabel(after.status)}`;

  const message = {
    token: webToken,
    notification: {
      title,
      body
    },
    data: {
      orderId: String(orderId),
      status: String(after.status || ''),
      url: '/orders'
    },
    webpush: {
      notification: {
        title,
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png'
      },
      fcmOptions: {
        link: '/orders'
      }
    }
  };

  try {
    await admin.messaging().send(message);
    logger.info(`Push sent for order ${orderId} to user ${after.user_id}`);
  } catch (error) {
    logger.error('FCM send failed', error);
    const code = error?.errorInfo?.code || '';
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      await admin.firestore().doc(`users/${after.user_id}`).set(
        {
          push_tokens: {
            web_fcm: admin.firestore.FieldValue.delete()
          }
        },
        { merge: true }
      );
      logger.info(`Invalid token removed for user ${after.user_id}`);
    }
  }
});
