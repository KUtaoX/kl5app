export default function Index({ admins }) {
    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Admin List 
            </h1>
            <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Permission 1</th>
                        <th>Permission 2</th>
                        <th>Permission 3</th>
                        <th>Permission 4</th>
                        <th>Permission 5</th>
                        <th>Permission 6</th>
                        <th>Permission 7</th>
                        <th>Permission 8</th>
                        <th>Permission 9</th>
                        <th>Permission 10</th>
                    </tr>
                </thead>
                <tbody>
                    {admins.map((admin) => (
                        <tr key={admin.id}>
                            <td>{admin.id}</td>
                            <td>{admin.username}</td>
                            <td>{admin.permission1}</td>
                            <td>{admin.permission2}</td>
                            <td>{admin.permission3}</td>
                            <td>{admin.permission4}</td>
                            <td>{admin.permission5}</td>
                            <td>{admin.permission6}</td>
                            <td>{admin.permission7}</td>
                            <td>{admin.permission8}</td>
                            <td>{admin.permission9}</td>
                            <td>{admin.permission10}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}