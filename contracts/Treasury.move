module onramp_addr::Treasury {
    use std::signer;
    use std::string::{Self, String};
    use std::timestamp;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::managed_coin;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::table::{Self, Table};
    use onramp_addr::OnRamp::TestUSDC;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;
    const E_INVALID_AMOUNT: u64 = 3;
    const E_TREASURY_PAUSED: u64 = 4;
    const E_INVALID_TOKEN: u64 = 5;

    /// Treasury configuration
    struct TreasuryConfig has key {
        admin: address,
        is_paused: bool,
        authorized_operators: Table<address, bool>,
        total_reserves: Table<String, u64>,
        min_reserves: Table<String, u64>,
        max_daily_withdrawal: Table<String, u64>,
        daily_withdrawals: Table<String, u64>,
        last_reset_day: u64,
    }

    /// Treasury operation event
    struct TreasuryOperation has store, drop {
        operator: address,
        operation_type: String, // "deposit", "withdraw", "transfer"
        token_type: String,
        amount: u64,
        recipient: address,
        timestamp: u64,
        reason: String,
    }

    /// Events
    struct TreasuryEvents has key {
        operation_events: EventHandle<TreasuryOperation>,
    }

    /// Initialize treasury
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        assert!(!exists<TreasuryConfig>(admin_addr), E_NOT_AUTHORIZED);

        let authorized_operators = table::new<address, bool>();
        table::add(&mut authorized_operators, admin_addr, true);

        let total_reserves = table::new<String, u64>();
        table::add(&mut total_reserves, string::utf8(b"APT"), 0);
        table::add(&mut total_reserves, string::utf8(b"USDC"), 0);

        let min_reserves = table::new<String, u64>();
        table::add(&mut min_reserves, string::utf8(b"APT"), 100000000); // 1 APT minimum
        table::add(&mut min_reserves, string::utf8(b"USDC"), 1000000); // 1 USDC minimum

        let max_daily_withdrawal = table::new<String, u64>();
        table::add(&mut max_daily_withdrawal, string::utf8(b"APT"), 10000000000); // 100 APT per day
        table::add(&mut max_daily_withdrawal, string::utf8(b"USDC"), 100000000); // 100 USDC per day

        let daily_withdrawals = table::new<String, u64>();
        table::add(&mut daily_withdrawals, string::utf8(b"APT"), 0);
        table::add(&mut daily_withdrawals, string::utf8(b"USDC"), 0);

        move_to(admin, TreasuryConfig {
            admin: admin_addr,
            is_paused: false,
            authorized_operators,
            total_reserves,
            min_reserves,
            max_daily_withdrawal,
            daily_withdrawals,
            last_reset_day: get_current_day(),
        });

        move_to(admin, TreasuryEvents {
            operation_events: account::new_event_handle<TreasuryOperation>(admin),
        });
    }

    /// Deposit tokens to treasury
    public entry fun deposit_apt(
        operator: &signer,
        amount: u64,
    ) acquires TreasuryConfig, TreasuryEvents {
        let operator_addr = signer::address_of(operator);
        check_authorization(operator_addr);
        
        assert!(amount > 0, E_INVALID_AMOUNT);
        
        // Transfer APT to treasury admin account
        let config = borrow_global_mut<TreasuryConfig>(@onramp_addr);
        coin::transfer<AptosCoin>(operator, config.admin, amount);
        
        // Update reserves
        let apt_reserves = table::borrow_mut(&mut config.total_reserves, string::utf8(b"APT"));
        *apt_reserves = *apt_reserves + amount;

        // Emit event
        let events = borrow_global_mut<TreasuryEvents>(@onramp_addr);
        event::emit_event(&mut events.operation_events, TreasuryOperation {
            operator: operator_addr,
            operation_type: string::utf8(b"deposit"),
            token_type: string::utf8(b"APT"),
            amount,
            recipient: config.admin,
            timestamp: timestamp::now_microseconds(),
            reason: string::utf8(b"Treasury deposit"),
        });
    }

    /// Withdraw APT from treasury (with daily limits)
    public entry fun withdraw_apt(
        operator: &signer,
        recipient: address,
        amount: u64,
        reason: String,
    ) acquires TreasuryConfig, TreasuryEvents {
        let operator_addr = signer::address_of(operator);
        check_authorization(operator_addr);
        
        let config = borrow_global_mut<TreasuryConfig>(@onramp_addr);
        assert!(!config.is_paused, E_TREASURY_PAUSED);
        assert!(amount > 0, E_INVALID_AMOUNT);

        // Check daily withdrawal limits
        reset_daily_limits_if_needed();
        
        let apt_daily = table::borrow_mut(&mut config.daily_withdrawals, string::utf8(b"APT"));
        let max_daily = *table::borrow(&config.max_daily_withdrawal, string::utf8(b"APT"));
        assert!(*apt_daily + amount <= max_daily, E_INVALID_AMOUNT);

        // Check minimum reserves
        let current_balance = coin::balance<AptosCoin>(config.admin);
        let min_reserve = *table::borrow(&config.min_reserves, string::utf8(b"APT"));
        assert!(current_balance >= amount + min_reserve, E_INSUFFICIENT_BALANCE);

        // Perform withdrawal (admin signs the transaction)
        // Note: In a real implementation, you'd need a more sophisticated approach
        // for the admin to sign transactions programmatically
        
        // Update daily withdrawal counter
        *apt_daily = *apt_daily + amount;

        // Update total reserves
        let total_reserves = table::borrow_mut(&mut config.total_reserves, string::utf8(b"APT"));
        *total_reserves = *total_reserves - amount;

        // Emit event
        let events = borrow_global_mut<TreasuryEvents>(@onramp_addr);
        event::emit_event(&mut events.operation_events, TreasuryOperation {
            operator: operator_addr,
            operation_type: string::utf8(b"withdraw"),
            token_type: string::utf8(b"APT"),
            amount,
            recipient,
            timestamp: timestamp::now_microseconds(),
            reason,
        });
    }

    /// Emergency withdraw (admin only, bypasses limits)
    public entry fun emergency_withdraw_apt(
        admin: &signer,
        recipient: address,
        amount: u64,
        reason: String,
    ) acquires TreasuryConfig, TreasuryEvents {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<TreasuryConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let current_balance = coin::balance<AptosCoin>(admin_addr);
        assert!(current_balance >= amount, E_INSUFFICIENT_BALANCE);

        // Transfer directly
        coin::transfer<AptosCoin>(admin, recipient, amount);

        // Update total reserves
        let total_reserves = table::borrow_mut(&mut config.total_reserves, string::utf8(b"APT"));
        if (*total_reserves >= amount) {
            *total_reserves = *total_reserves - amount;
        } else {
            *total_reserves = 0;
        };

        // Emit event
        let events = borrow_global_mut<TreasuryEvents>(@onramp_addr);
        event::emit_event(&mut events.operation_events, TreasuryOperation {
            operator: admin_addr,
            operation_type: string::utf8(b"emergency_withdraw"),
            token_type: string::utf8(b"APT"),
            amount,
            recipient,
            timestamp: timestamp::now_microseconds(),
            reason,
        });
    }

    /// Set treasury limits (admin only)
    public entry fun set_limits(
        admin: &signer,
        token_type: String,
        min_reserve: u64,
        max_daily: u64,
    ) acquires TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<TreasuryConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);

        // Update minimum reserves
        if (table::contains(&config.min_reserves, token_type)) {
            *table::borrow_mut(&mut config.min_reserves, token_type) = min_reserve;
        } else {
            table::add(&mut config.min_reserves, token_type, min_reserve);
        };

        // Update maximum daily withdrawal
        if (table::contains(&config.max_daily_withdrawal, token_type)) {
            *table::borrow_mut(&mut config.max_daily_withdrawal, token_type) = max_daily;
        } else {
            table::add(&mut config.max_daily_withdrawal, token_type, max_daily);
        };
    }

    /// Add authorized operator (admin only)
    public entry fun add_operator(admin: &signer, operator: address) acquires TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<TreasuryConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        
        if (table::contains(&config.authorized_operators, operator)) {
            *table::borrow_mut(&mut config.authorized_operators, operator) = true;
        } else {
            table::add(&mut config.authorized_operators, operator, true);
        };
    }

    /// Remove authorized operator (admin only)
    public entry fun remove_operator(admin: &signer, operator: address) acquires TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<TreasuryConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        
        if (table::contains(&config.authorized_operators, operator)) {
            *table::borrow_mut(&mut config.authorized_operators, operator) = false;
        };
    }

    /// Pause/unpause treasury (admin only)
    public entry fun set_pause_status(admin: &signer, paused: bool) acquires TreasuryConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<TreasuryConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        config.is_paused = paused;
    }

    /// Get treasury balances
    public fun get_balances(): (u64, u64, u64, u64) acquires TreasuryConfig {
        let config = borrow_global<TreasuryConfig>(@onramp_addr);
        
        let apt_balance = coin::balance<AptosCoin>(config.admin);
        let usdc_balance = if (coin::is_account_registered<TestUSDC>(config.admin)) {
            coin::balance<TestUSDC>(config.admin)
        } else {
            0
        };
        
        let apt_reserves = *table::borrow(&config.total_reserves, string::utf8(b"APT"));
        let usdc_reserves = *table::borrow(&config.total_reserves, string::utf8(b"USDC"));
        
        (apt_balance, usdc_balance, apt_reserves, usdc_reserves)
    }

    /// Get daily withdrawal status
    public fun get_daily_withdrawal_status(token_type: String): (u64, u64, u64) acquires TreasuryConfig {
        let config = borrow_global<TreasuryConfig>(@onramp_addr);
        
        let used = if (table::contains(&config.daily_withdrawals, token_type)) {
            *table::borrow(&config.daily_withdrawals, token_type)
        } else {
            0
        };
        
        let max_daily = if (table::contains(&config.max_daily_withdrawal, token_type)) {
            *table::borrow(&config.max_daily_withdrawal, token_type)
        } else {
            0
        };
        
        let remaining = if (max_daily > used) { max_daily - used } else { 0 };
        
        (used, max_daily, remaining)
    }

    /// Helper function to check authorization
    fun check_authorization(operator: address) acquires TreasuryConfig {
        let config = borrow_global<TreasuryConfig>(@onramp_addr);
        assert!(
            table::contains(&config.authorized_operators, operator) &&
            *table::borrow(&config.authorized_operators, operator),
            E_NOT_AUTHORIZED
        );
    }

    /// Helper function to get current day (for daily limits)
    fun get_current_day(): u64 {
        timestamp::now_microseconds() / (24 * 60 * 60 * 1000000) // Convert to days
    }

    /// Reset daily withdrawal limits if a new day has started
    fun reset_daily_limits_if_needed() acquires TreasuryConfig {
        let config = borrow_global_mut<TreasuryConfig>(@onramp_addr);
        let current_day = get_current_day();
        
        if (current_day > config.last_reset_day) {
            // Reset all daily withdrawal counters
            *table::borrow_mut(&mut config.daily_withdrawals, string::utf8(b"APT")) = 0;
            *table::borrow_mut(&mut config.daily_withdrawals, string::utf8(b"USDC")) = 0;
            config.last_reset_day = current_day;
        };
    }
}
