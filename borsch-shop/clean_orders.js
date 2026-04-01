const pbUrl = 'https://borsch.shop';
async function clean() {
    try {
        const authResp = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'klaizar@gmail.com', password: 'AsdZxc123!@' })
        });
        const authData = await authResp.json();
        const token = authData.token;

        const dateThresh = "2026-03-31"; 
        const filterStr = encodeURIComponent("customer_name~'Митя'");
        const query = await fetch(`${pbUrl}/api/collections/orders/records?filter=${filterStr}&perPage=500`, {
            headers: { 'Authorization': token }
        });
        const data = await query.json();
        console.log(`Found ${data.items ? data.items.length : 0} orders for "Митя".`);

        if (data.items) {
            for(let item of data.items) {
                await fetch(`${pbUrl}/api/collections/orders/records/${item.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': token }
                });
                console.log("Deleted from PB", item.id);
            }
        }
    } catch(err) {
        console.error(err);
    }
}
clean();
