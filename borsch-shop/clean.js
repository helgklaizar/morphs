const pbUrl = 'https://borsch.shop';
async function clean() {
    const authResp = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'klaizar@gmail.com', password: 'AsdZxc123!@' })
    });
    const authData = await authResp.json();
    const token = authData.token;

    const query = await fetch(`${pbUrl}/api/collections/orders/records?filter=(customer_name~'Митя')&perPage=500`, {
        headers: { 'Authorization': token }
    });
    const data = await query.json();
    console.log(`Found ${data.items.length} orders for "Митя".`);

    for(let item of data.items) {
        await fetch(`${pbUrl}/api/collections/orders/records/${item.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        console.log("Deleted", item.id);
    }
}
clean();
