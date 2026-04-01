// pb_hooks/redirects.pb.js
// Bypasses Telegram InlineKeyboardButton restrictions by serving HTTP redirects

routerAdd("GET", "/api/call", (c) => {
    const phone = c.queryParam("phone");
    const html = `<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script>
        window.location.href = "tel:" + "${phone}";
    </script>
</head>
<body style="font-family: sans-serif; padding: 40px 20px; text-align: center;">
    <h2>Открытие звонилки...</h2>
    <p style="color: grey;">Если звонок не начался автоматически, нажмите на кнопку ниже:</p>
    <br><br>
    <a href="tel:${phone}" style="display:inline-block; padding: 15px 30px; background: #ff4700; color: white; text-decoration: none; border-radius: 10px; font-size: 22px; font-weight: bold;">📞 Позвонить ${phone}</a>
</body>
</html>`;
    return c.html(200, html);
});

routerAdd("GET", "/api/route", (c) => {
    const address = c.queryParam("address");
    const encAddress = encodeURIComponent(address);
    const html = `<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Маршрут</title>
</head>
<body style="font-family: sans-serif; padding: 40px 20px; text-align: center; background: #f9f9f9;">
    <h3 style="margin-bottom: 10px;">Куда едем?</h3>
    <p style="color: grey; margin-bottom: 40px; font-size: 14px;">${address}</p>
    
    <a href="https://waze.com/ul?q=${encAddress}" style="display:block; padding: 20px; background: #33ccff; text-align:center; text-decoration: none; color: white; border-radius: 12px; margin-bottom: 20px; font-size: 20px; font-weight: bold;">🚙 Открыть в Waze</a>
    
    <a href="https://www.google.com/maps/search/?api=1&query=${encAddress}" style="display:block; padding: 20px; background: #34a853; text-align:center; text-decoration: none; color: white; border-radius: 12px; font-size: 20px; font-weight: bold;">🗺 Открыть в Google Maps</a>
</body>
</html>`;
    return c.html(200, html);
});
