const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const admin = require('firebase-admin');
const firestore = admin.firestore();

const UIDs = [];

let sendTextAlert = (message, uid) => {
  // Get user phone number
  firestore
    .collection('users')
    .doc(uid)
    .get()
    .then(doc => {
      let number = doc.data().alerts.text.number;
      client.messages
        .create({
          body: message,
          from: '+13478970321',
          to: `+1${number}`
        })
        .then(message => console.log(message.sid))
        .done();
    });
};

let deleteAlertAfterComparisonPasses = (uid, exchange) => {
  firestore
    .collection('users')
    .doc(uid)
    .collection('active-alerts')
    .doc(exchange)
    .delete();
};

let compareUserAlertToNewArb = (uid, exchange, currentArb) => {
  firestore
    .collection('users')
    .doc(uid)
    .collection('active-alerts')
    .where('exchange', '==', exchange)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        if (doc.data().spreadPercAtCreation < doc.data().spreadPercChange) {
          if (currentArb.spreadPercentage >= doc.data().spreadPercChange) {
            // spread increased to specified amount alert user
            console.log('alert increased', exchange);
            deleteAlertAfterComparisonPasses(uid, exchange);
            sendTextAlert(
              `${exchange} increased to ${
                doc.data().spreadPercChange
              }% from ${doc.data().spreadPercAtCreation.toFixed(4)}%`,
              uid
            );
          }
        } else {
          if (currentArb.spreadPercentage <= doc.data().spreadPercChange) {
            // spread decreased to specified amount alert user
            console.log('alert decreased', exchange);
            deleteAlertAfterComparisonPasses(uid, exchange);
            sendTextAlert(
              `${exchange} decreased to ${
                doc.data().spreadPercChange
              }% from ${doc.data().spreadPercAtCreation.toFixed(4)}%`,
              uid
            );
          }
        }
      });
    });
};

let getUsersWithAlertsEnabled = () => {
  firestore
    .collection('users')
    .where('alerts.text.number', '>', '')
    .where('alerts.text.receive', '==', true)
    .get()
    .then(snapshot => {
      UIDs.splice(0, UIDs.length);
      snapshot.forEach(doc => {
        UIDs.push(doc.data().uid);
      });
    });
};

let getUIDsWithAlertsEnabled = () => {
  return UIDs;
};

module.exports = {
  getUsersWithAlertsEnabled,
  getUIDsWithAlertsEnabled,
  compareUserAlertToNewArb
};
