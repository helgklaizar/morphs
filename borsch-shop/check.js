const pbUrl = 'https://borsch.shop';
async function run() {
    try {
        const authResp = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'klaizar@gmail.com', password: 'AsdZxc123!@' })
        });
        const authData = await authResp.json();
        
        const q = await fetch(`${pbUrl}/api/collections/orders/records?perPage=500&sort=-created`, {
            headers: { 'Authorization': authData.token }
        });
        const d = await q.json();
        const mityaOrders = d.items.filter(o => o.customer_name && o.customer_name.includes('Митя'));
        console.log("Mitya orders count in PB:", mityaOrders.length);
        if (mityaOrders.length > 0) {
            console.log(mityaOrders.map(o => ({id: o.id, name: o.customer_name, created: o.created, amount: o.total_amount })));
        }
    } catch(e) { console.error(e); }
}
run();
