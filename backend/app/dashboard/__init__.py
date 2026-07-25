"""Dashboard infrastructure module.

Provides a reusable, configuration-light statistics aggregation service. Each
"widget" is a small provider callback registered in :data:`WIDGET_PROVIDERS`.
Adding a new dashboard stat only requires registering an additional provider,
so no endpoint or controller changes are needed when metrics evolve.
"""
