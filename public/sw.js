// PiezaCerca · "service worker": recibe las notificaciones aunque la app esté cerrada.

self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : "" };
  }
  const titulo = datos.titulo || "PiezaCerca";
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || "Tienes una solicitud nueva",
      icon: "/icono/192",
      badge: "/icono/96",
      tag: datos.etiqueta || "piezacerca",
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      data: { url: datos.url || "/tienda" },
    }),
  );
});

// Al tocar la notificación: abre (o trae al frente) PiezaCerca en el Modo tienda.
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.url) || "/tienda", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if (ventana.url.startsWith(self.location.origin) && "focus" in ventana) {
          ventana.navigate(destino);
          return ventana.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
