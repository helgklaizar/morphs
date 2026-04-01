// pb_hooks/call_redirect.pb.js
// Bypasses Telegram InlineKeyboardButton 'tel:' restriction by serving an HTTP redirect
routerAdd("GET", "/api/call", (c) => {
    const phone = c.queryParam("phone");
    const html = `<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script>
        window.location.href = "tel:" + "${phone}";
    </script>
</head>
<body style="font-family: sans-serif; padding: 20px; text-align: center;">
    <h3>Открытие звонилки...</h3>
    <p>Если звонок не начался автоматически, нажмите на кнопку ниже:</p>
    <br>
    <a href="tel:${phone}" style="padding: 15px 30px; background: #ff4700; color: white; text-decoration: none; border-radius: 10px; font-size: 18px;">📞 Позвонить ${phone}</a>
</body>
</html>`;
    return c.html(200, html);
});
