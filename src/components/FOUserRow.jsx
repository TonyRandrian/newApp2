function FOUserRow({customer, onClick}) {
    return (
        <tr>
            <td>{customer.id}</td>
            <td>{customer.firstname}</td>
            <td>{customer.lastname}</td>
            <td>{customer.email}</td>
            <td>
                <div className="fo-table__actions">
                    <button type="button" className="fo-btn--primary fo-btn--sm" onClick={onClick}>
                        Se connecter
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default FOUserRow;
