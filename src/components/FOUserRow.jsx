function FOUserRow({customer, onClick}) {

    return <tr>
        <td>{customer.id}</td>
        <td>{customer.firstname}</td>
        <td>{customer.lastname}</td>
        <td>{customer.email}</td>
        <td>
            <button type={"button"} onClick={onClick}>
                Se connecter
            </button>
        </td>
    </tr>
}

export default FOUserRow;