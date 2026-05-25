import api from "../utils/api"
import { toXML, toJSON } from "../xml/myOrderStateXML.js"
import { toDate, formatDateTime } from "../utils/utils"
import OrderHistory from "./OrderHistory.js"

class MyOrderState {
    endpoint = "my_order_state"

    constructor(xml, validate = true) {
        const data = toJSON(xml) || {}

        this.orderId = data.orderId ?? data.idOrder ?? 0
        this.orderStateId = data.orderStateId ?? data.idOrderState ?? 0
        this.employeeId = data.employeeId ?? data.idEmployee ?? 0
        this.date = formatDateTime(toDate(data.date) ?? data.date)
        this.useExistingPayment = data.useExistingPayment ? 1 : 0
        this.sendEmail = 0 // toujours 0

        if (validate) {
            const missing = []

            if (!this.orderId) {
                missing.push("orderId")
            }

            if (!this.orderStateId) {
                missing.push("orderStateId")
            }

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(", ")}`)
            }
        }
    }

    static fromJSON(JsonData, validate = true) {
        return new MyOrderState(toXML(JsonData), validate)
    }

    static fromData(data) {
        const obj = Object.create(MyOrderState.prototype)
        Object.assign(obj, data)
        obj.endpoint = "my_order_state"
        return obj
    }

    async save() {
        const xml = await api.post(this.endpoint, toXML(this))
        return new OrderHistory(xml)
    }
}

export default MyOrderState
