importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC37QeZkmFsl9NNik9kuktlkftkuWykgYE",
  authDomain: "doctor-8edc6.firebaseapp.com",
  databaseURL: "https://doctor-8edc6-default-rtdb.firebaseio.com/",
  projectId: "doctor-8edc6",
  storageBucket: "doctor-8edc6.firebasestorage.app",
  messagingSenderId: "12849007676",
  appId: "1:12849007676:web:a049a76c627e3392aa8739"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title || "Medicine Reminder";
  const notificationOptions = {
    body: payload.notification.body || "Time to take your medicine.",
    icon: '/favicon.ico'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
