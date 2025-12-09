export type Language = 'en' | 'es';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.settings': 'Settings',
    'common.signOut': 'Sign Out',
    'common.darkMode': 'Dark Mode',
    'common.language': 'Language',
    'common.manageAccount': 'Manage your account',
    'common.english': 'English',
    'common.spanish': 'Español',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search...',
    'common.loading': 'Loading...',
    'common.noResults': 'No results found',
    
    // Navigation
    'nav.home': 'Home',
    'nav.budget': 'Budget',
    'nav.income': 'Income',
    'nav.expenses': 'Expenses',
    'nav.goals': 'Goals',
    'nav.subscriptions': 'Subscriptions',
    'nav.subs': 'Subs',
    'nav.sage': 'Sage',
    'nav.account': 'Account',
    'nav.settings': 'Settings',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.availableBalance': 'Available Balance',
    'dashboard.totalSavings': 'Total Savings',
    'dashboard.monthlyIncome': 'Monthly Income',
    'dashboard.monthlyExpenses': 'Monthly Expenses',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.upcomingTransactions': 'Upcoming Transactions',
    'dashboard.exportPDF': 'Export PDF',
    
    // Budget
    'budget.title': 'Budget',
    'budget.addBudget': 'Add Budget',
    'budget.expenseAllocation': 'Expense Allocation',
    'budget.savingsAllocation': 'Savings Allocation',
    'budget.spent': 'Spent',
    'budget.remaining': 'Remaining',
    
    // Income
    'income.title': 'Income',
    'income.addIncome': 'Add Income',
    'income.totalIncome': 'Total Income',
    
    // Expenses
    'expenses.title': 'Expenses',
    'expenses.addExpense': 'Add Expense',
    'expenses.totalExpenses': 'Total Expenses',
    
    // Goals
    'goals.title': 'Goals',
    'goals.addGoal': 'Add Goal',
    'goals.targetAmount': 'Target Amount',
    'goals.currentAmount': 'Current Amount',
    'goals.targetDate': 'Target Date',
    'goals.progress': 'Progress',
    'goals.addFunds': 'Add Funds',
    
    // Subscriptions
    'subscriptions.title': 'Subscriptions',
    'subscriptions.active': 'Active',
    'subscriptions.paused': 'Paused',
    'subscriptions.cancelled': 'Cancelled',
    'subscriptions.billingHistory': 'Billing History',
    'subscriptions.recurringExpenses': 'Recurring Expenses',
    
    // Account
    'account.title': 'Account',
    'account.profile': 'Profile',
    'account.preferences': 'Preferences',
    'account.security': 'Security',
    'account.deleteAccount': 'Delete Account',
    'account.resetTutorials': 'Reset Tutorials',
    
    // Sage
    'sage.title': 'Sage AI Advisor',
    'sage.askQuestion': 'Ask a question...',
    'sage.forecastAnalysis': 'Forecast & Analysis',
  },
  es: {
    // Common
    'common.settings': 'Configuración',
    'common.signOut': 'Cerrar Sesión',
    'common.darkMode': 'Modo Oscuro',
    'common.language': 'Idioma',
    'common.manageAccount': 'Administrar tu cuenta',
    'common.english': 'English',
    'common.spanish': 'Español',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Agregar',
    'common.search': 'Buscar...',
    'common.loading': 'Cargando...',
    'common.noResults': 'No se encontraron resultados',
    
    // Navigation
    'nav.home': 'Inicio',
    'nav.budget': 'Presupuesto',
    'nav.income': 'Ingresos',
    'nav.expenses': 'Gastos',
    'nav.goals': 'Metas',
    'nav.subscriptions': 'Suscripciones',
    'nav.subs': 'Subs',
    'nav.sage': 'Sage',
    'nav.account': 'Cuenta',
    'nav.settings': 'Ajustes',
    
    // Dashboard
    'dashboard.title': 'Panel',
    'dashboard.availableBalance': 'Saldo Disponible',
    'dashboard.totalSavings': 'Ahorros Totales',
    'dashboard.monthlyIncome': 'Ingresos Mensuales',
    'dashboard.monthlyExpenses': 'Gastos Mensuales',
    'dashboard.recentActivity': 'Actividad Reciente',
    'dashboard.upcomingTransactions': 'Próximas Transacciones',
    'dashboard.exportPDF': 'Exportar PDF',
    
    // Budget
    'budget.title': 'Presupuesto',
    'budget.addBudget': 'Agregar Presupuesto',
    'budget.expenseAllocation': 'Asignación de Gastos',
    'budget.savingsAllocation': 'Asignación de Ahorros',
    'budget.spent': 'Gastado',
    'budget.remaining': 'Restante',
    
    // Income
    'income.title': 'Ingresos',
    'income.addIncome': 'Agregar Ingreso',
    'income.totalIncome': 'Ingresos Totales',
    
    // Expenses
    'expenses.title': 'Gastos',
    'expenses.addExpense': 'Agregar Gasto',
    'expenses.totalExpenses': 'Gastos Totales',
    
    // Goals
    'goals.title': 'Metas',
    'goals.addGoal': 'Agregar Meta',
    'goals.targetAmount': 'Monto Objetivo',
    'goals.currentAmount': 'Monto Actual',
    'goals.targetDate': 'Fecha Objetivo',
    'goals.progress': 'Progreso',
    'goals.addFunds': 'Agregar Fondos',
    
    // Subscriptions
    'subscriptions.title': 'Suscripciones',
    'subscriptions.active': 'Activas',
    'subscriptions.paused': 'Pausadas',
    'subscriptions.cancelled': 'Canceladas',
    'subscriptions.billingHistory': 'Historial de Facturación',
    'subscriptions.recurringExpenses': 'Gastos Recurrentes',
    
    // Account
    'account.title': 'Cuenta',
    'account.profile': 'Perfil',
    'account.preferences': 'Preferencias',
    'account.security': 'Seguridad',
    'account.deleteAccount': 'Eliminar Cuenta',
    'account.resetTutorials': 'Reiniciar Tutoriales',
    
    // Sage
    'sage.title': 'Sage Asesor IA',
    'sage.askQuestion': 'Haz una pregunta...',
    'sage.forecastAnalysis': 'Pronóstico y Análisis',
  }
};
