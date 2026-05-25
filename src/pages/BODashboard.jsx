import { useEffect, useMemo, useState } from "react"
import {
	aggregateDashboardRowsByDay,
	aggregateCartDashboardRowsByDay,
	countDashboardRows,
	filterDashboardRowsByDates,
	filterDashboardRowsByStatus,
	loadDashboardData,
	sumCartDashboardRowsTotals,
	sumDashboardRowsTotals,
} from "../backend/services/DashboardService.js"
import BODashboardTable from "../components/BODashboardTable.jsx"
import { formatAmount, getOrderStateLabel } from "../backend/utils/dashboardUtils.js"

function BODashboard() {
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")
	const [dashboardRows, setDashboardRows] = useState([])
	const [cartDashboardRows, setCartDashboardRows] = useState([])
	const [orderStates, setOrderStates] = useState([])
	const [dateMin, setDateMin] = useState("")
	const [dateMax, setDateMax] = useState("")
	const [statusId, setStatusId] = useState("all")

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true)
				setError("")

				const data = await loadDashboardData()
				setDashboardRows(data.dashboardRows ?? [])
				setCartDashboardRows(data.cartDashboardRows ?? [])
				setOrderStates((data.orderStates ?? []).filter((state) => Number(state?.id) !== 6))
			} catch (err) {
				setError(err?.message || "Erreur lors du chargement du dashboard")
			} finally {
				setLoading(false)
			}
		}

		load()
	}, [])

	const filteredRows = useMemo(() => {
		const byDate = filterDashboardRowsByDates(dashboardRows, dateMin, dateMax)
		return filterDashboardRowsByStatus(byDate, statusId)
	}, [dashboardRows, dateMin, dateMax, statusId])

	const dailyRows = useMemo(() => aggregateDashboardRowsByDay(filteredRows), [filteredRows])
	const totals = useMemo(() => sumDashboardRowsTotals(filteredRows), [filteredRows])
	const ordersCount = useMemo(() => countDashboardRows(filteredRows), [filteredRows])

	const filteredCartRows = useMemo(() => {
		return filterDashboardRowsByDates(cartDashboardRows, dateMin, dateMax)
	}, [cartDashboardRows, dateMin, dateMax])

	const cartDailyRows = useMemo(() => aggregateCartDashboardRowsByDay(filteredCartRows), [filteredCartRows])
	const cartTotals = useMemo(() => sumCartDashboardRowsTotals(filteredCartRows), [filteredCartRows])
	const cartCount = useMemo(() => countDashboardRows(filteredCartRows), [filteredCartRows])

	const resetFilters = () => {
		setDateMin("")
		setDateMax("")
		setStatusId("all")
	}

	return (
		<div className="bo-page">
			<header className="bo-page__head">
				<div className="bo-page__heading">
					<span className="bo-page__eyebrow">Pilotage</span>
					<h1 className="bo-page__title">Tableau de bord</h1>
					<p className="bo-page__subtitle">
						Vue d'ensemble des commandes et paniers sur la période sélectionnée.
					</p>
				</div>
			</header>

			{loading && <p className="bo-status bo-status--loading">Chargement des indicateurs…</p>}
			{!loading && error && (
				<div className="bo-banner bo-banner--error">
					<span className="bo-banner__title">Erreur :</span>
					{error}
				</div>
			)}

			{!loading && !error && (
				<div className="bo-page__body">
					<div className="bo-card">
						<div className="bo-card__head">
							<div className="bo-card__heading">
								<h3 className="bo-card__title">Commandes</h3>
								<span className="bo-card__subtitle">Indicateurs sur la période filtrée</span>
							</div>
						</div>
						<div className="bo-card__body bo-card__body--flush">
							<div className="bo-kpis">
								<div className="bo-kpi">
									<span className="bo-kpi__label">Nombre de commandes</span>
									<strong className="bo-kpi__value">{ordersCount}</strong>
								</div>
								<div className="bo-kpi">
									<span className="bo-kpi__label">Total HT</span>
									<strong className="bo-kpi__value">{formatAmount(totals.totalHT)}</strong>
								</div>
								<div className="bo-kpi">
									<span className="bo-kpi__label">Total TTC</span>
									<strong className="bo-kpi__value">{formatAmount(totals.totalTTC)}</strong>
								</div>
							</div>
						</div>
					</div>

					<div className="bo-card">
						<div className="bo-card__head">
							<div className="bo-card__heading">
								<h3 className="bo-card__title">Paniers sans commande</h3>
								<span className="bo-card__subtitle">Paniers abandonnés ou en attente</span>
							</div>
						</div>
						<div className="bo-card__body bo-card__body--flush">
							<div className="bo-kpis">
								<div className="bo-kpi">
									<span className="bo-kpi__label">Nombre de paniers</span>
									<strong className="bo-kpi__value">{cartCount}</strong>
								</div>
								<div className="bo-kpi">
									<span className="bo-kpi__label">Total HT</span>
									<strong className="bo-kpi__value">{formatAmount(cartTotals.totalHT)}</strong>
								</div>
								<div className="bo-kpi">
									<span className="bo-kpi__label">Total TTC</span>
									<strong className="bo-kpi__value">{formatAmount(cartTotals.totalTTC)}</strong>
								</div>
							</div>
						</div>
					</div>

					<div className="bo-card">
						<div className="bo-card__head">
							<div className="bo-card__heading">
								<h3 className="bo-card__title">Filtres</h3>
								<span className="bo-card__subtitle">Restreindre la période et le statut</span>
							</div>
						</div>
						<div className="bo-card__body">
							<div className="bo-filters">
								<label className="bo-filter">
									<span className="bo-filter__label">Date de début</span>
									<input
										type="date"
										value={dateMin}
										onChange={(event) => setDateMin(event.target.value)}
									/>
								</label>
								<label className="bo-filter">
									<span className="bo-filter__label">Date de fin</span>
									<input
										type="date"
										value={dateMax}
										onChange={(event) => setDateMax(event.target.value)}
									/>
								</label>
								<label className="bo-filter">
									<span className="bo-filter__label">Statut commande</span>
									<select value={statusId} onChange={(event) => setStatusId(event.target.value)}>
										<option value="all">Tous les statuts</option>
										{orderStates.map((state) => (
											<option key={state.id} value={state.id}>
												{getOrderStateLabel(state)}
											</option>
										))}
									</select>
								</label>
								<div className="bo-filters__actions">
									<button type="button" className="bo-btn--ghost" onClick={resetFilters}>
										Réinitialiser les filtres
									</button>
								</div>
							</div>
						</div>
					</div>

					<div className="bo-card">
						<div className="bo-card__head">
							<div className="bo-card__heading">
								<h3 className="bo-card__title">Commandes journalières</h3>
								<span className="bo-card__subtitle">Agrégation par jour</span>
							</div>
						</div>
						<div className="bo-card__body bo-card__body--flush">
							<BODashboardTable rows={dailyRows} />
						</div>
					</div>

					<div className="bo-card">
						<div className="bo-card__head">
							<div className="bo-card__heading">
								<h3 className="bo-card__title">Paniers journaliers</h3>
								<span className="bo-card__subtitle">Agrégation par jour</span>
							</div>
						</div>
						<div className="bo-card__body bo-card__body--flush">
							<BODashboardTable rows={cartDailyRows} countHeader="Paniers" countKey="cartsCount" />
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default BODashboard
