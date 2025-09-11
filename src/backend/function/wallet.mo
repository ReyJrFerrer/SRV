import Principal "mo:base/Principal";
import Trie "mo:base/Trie";
import Result "mo:base/Result";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Text "mo:base/Text";

persistent actor Wallet {
    // Type definitions
    public type Balance = Nat;
    
    public type WalletResult<T> = Result.Result<T, Text>;
    
    public type TransactionType = {
        #Credit;
        #Debit;
        #Transfer;
    };
    
    public type Transaction = {
        id: Text;
        from: ?Principal;
        to: ?Principal;
        amount: Nat;
        transaction_type: TransactionType;
        timestamp: Int;
        description: Text;
    };

    // Key type for Trie
    private type Key<T> = Trie.Key<T>;
    
    // Helper function to create Principal key
    private func principalKey(p : Principal) : Key<Principal> = { key = p; hash = Principal.hash(p) };
    
    // Helper function to create Text key
    private func textKey(t : Text) : Key<Text> = { key = t; hash = Text.hash(t) };

    // Stable storage for balances
    private var balanceEntries : [(Principal, Nat)] = [];
    private transient var balances : Trie.Trie<Principal, Nat> = Trie.empty();
    
    // Stable storage for transactions
    private var transactionEntries : [(Text, Transaction)] = [];
    private transient var transactions : Trie.Trie<Text, Transaction> = Trie.empty();
    
    // Stable storage for authorized principals (controllers)
    private var authorizedEntries : [Principal] = [];
    private transient var authorized = Array.thaw<Principal>(authorizedEntries);
    
    // Transaction counter for generating unique IDs
    private var transactionCounter : Nat = 0;

    // System functions for upgrade persistence
    system func preupgrade() {
        balanceEntries := Trie.toArray(balances, func(k, v) = (k, v));
        transactionEntries := Trie.toArray(transactions, func(k, v) = (k, v));
        authorizedEntries := Array.freeze(authorized);
    };

    system func postupgrade() {
        // Restore balances from stable storage
        for ((principal, balance) in balanceEntries.vals()) {
            balances := Trie.put(balances, principalKey(principal), Principal.equal, balance).0;
        };
        
        // Restore transactions from stable storage
        for ((txId, transaction) in transactionEntries.vals()) {
            transactions := Trie.put(transactions, textKey(txId), Text.equal, transaction).0;
        };
        
        // Clear stable storage
        balanceEntries := [];
        transactionEntries := [];
        authorizedEntries := [];
    };

    // Helper function to check if caller is authorized
    private func isAuthorized(caller: Principal) : Bool {
        Array.find<Principal>(Array.freeze(authorized), func(p) = Principal.equal(p, caller)) != null
    };

    // Helper function to generate transaction ID
    private func generateTransactionId() : Text {
        transactionCounter += 1;
        "txn_" # Int.toText(transactionCounter)
    };

    // Helper function to record transaction
    private func recordTransaction(
        from: ?Principal, 
        to: ?Principal, 
        amount: Nat, 
        txType: TransactionType, 
        description: Text
    ) : Text {
        let txId = generateTransactionId();
        let transaction : Transaction = {
            id = txId;
            from = from;
            to = to;
            amount = amount;
            transaction_type = txType;
            timestamp = Time.now();
            description = description;
        };
        transactions := Trie.put(transactions, textKey(txId), Text.equal, transaction).0;
        txId
    };

    // Helper function for safe subtraction
    private func safeSub(a: Nat, b: Nat) : ?Nat {
        if (a >= b) {
            ?(a - b)
        } else {
            null
        }
    };

    // Public function: Get balance (Query)
    public query func get_balance() : async Nat {
        let caller = Principal.fromActor(Wallet);
        switch (Trie.get(balances, principalKey(caller), Principal.equal)) {
            case (?balance) { balance };
            case null { 0 };
        }
    };

    // Public function: Get balance for specific principal (Query)
    public query func get_balance_of(principal: Principal) : async Nat {
        switch (Trie.get(balances, principalKey(principal), Principal.equal)) {
            case (?balance) { balance };
            case null { 0 };
        }
    };

    // Public function: Credit a user's balance (Update)
    public func credit(principal: Principal, amount: Nat) : async WalletResult<Nat> {
        let caller = Principal.fromActor(Wallet);
        
        if (not isAuthorized(caller)) {
            return #err("Unauthorized: Only authorized controllers can credit balances");
        };

        if (amount == 0) {
            return #err("Invalid amount: Must be greater than 0");
        };

        let currentBalance = switch (Trie.get(balances, principalKey(principal), Principal.equal)) {
            case (?balance) { balance };
            case null { 0 };
        };

        let newBalance = currentBalance + amount;
        balances := Trie.put(balances, principalKey(principal), Principal.equal, newBalance).0;

        let txId = recordTransaction(
            null, 
            ?principal, 
            amount, 
            #Credit, 
            "Balance credited by controller"
        );

        #ok(newBalance)
    };

    // Public function: Debit a user's balance (Update)
    public func debit(principal: Principal, amount: Nat) : async WalletResult<Nat> {
        let caller = Principal.fromActor(Wallet);
        
        if (not isAuthorized(caller)) {
            return #err("Unauthorized: Only authorized controllers can debit balances");
        };

        if (amount == 0) {
            return #err("Invalid amount: Must be greater than 0");
        };

        let currentBalance = switch (Trie.get(balances, principalKey(principal), Principal.equal)) {
            case (?balance) { balance };
            case null { 0 };
        };

        switch (safeSub(currentBalance, amount)) {
            case (?newBalance) {
                balances := Trie.put(balances, principalKey(principal), Principal.equal, newBalance).0;

                let txId = recordTransaction(
                    ?principal, 
                    null, 
                    amount, 
                    #Debit, 
                    "Balance debited by controller"
                );

                #ok(newBalance)
            };
            case null {
                #err("Insufficient balance: Cannot debit more than available balance")
            };
        }
    };

    // Public function: Transfer funds between users (Update)
    public func transfer(from: Principal, to: Principal, amount: Nat) : async WalletResult<Text> {
        let caller = Principal.fromActor(Wallet);
        
        // Allow the user to transfer their own funds, or authorized controllers to transfer any funds
        if (not (Principal.equal(caller, from) or isAuthorized(caller))) {
            return #err("Unauthorized: Can only transfer your own funds or be an authorized controller");
        };

        if (amount == 0) {
            return #err("Invalid amount: Must be greater than 0");
        };

        if (Principal.equal(from, to)) {
            return #err("Invalid transfer: Cannot transfer to the same account");
        };

        // Check sender's balance
        let fromBalance = switch (Trie.get(balances, principalKey(from), Principal.equal)) {
            case (?balance) { balance };
            case null { 0 };
        };

        switch (safeSub(fromBalance, amount)) {
            case (?newFromBalance) {
                // Get receiver's balance
                let toBalance = switch (Trie.get(balances, principalKey(to), Principal.equal)) {
                    case (?balance) { balance };
                    case null { 0 };
                };

                let newToBalance = toBalance + amount;

                // Update balances
                balances := Trie.put(balances, principalKey(from), Principal.equal, newFromBalance).0;
                balances := Trie.put(balances, principalKey(to), Principal.equal, newToBalance).0;

                let txId = recordTransaction(
                    ?from, 
                    ?to, 
                    amount, 
                    #Transfer, 
                    "Transfer between users"
                );

                #ok(txId)
            };
            case null {
                #err("Insufficient balance: Cannot transfer more than available balance")
            };
        }
    };

    // Public function: Get transaction history for a user (Query)
    public query func get_transaction_history(principal: Principal) : async [Transaction] {
        let caller = Principal.fromActor(Wallet);
        
        // Users can see their own transactions, authorized controllers can see any
        if (not (Principal.equal(caller, principal) or isAuthorized(caller))) {
            return [];
        };

        let allTransactions = Trie.toArray(transactions, func(k, v) = v);
        Array.mapFilter<Transaction, Transaction>(
            allTransactions,
            func(tx) {
                switch (tx.from, tx.to) {
                    case (?from, ?to) {
                        if (Principal.equal(from, principal) or Principal.equal(to, principal)) {
                            ?tx
                        } else {
                            null
                        }
                    };
                    case (?from, null) {
                        if (Principal.equal(from, principal)) { ?tx } else { null }
                    };
                    case (null, ?to) {
                        if (Principal.equal(to, principal)) { ?tx } else { null }
                    };
                    case (null, null) { null };
                }
            }
        )
    };

    // Admin function: Add authorized controller
    public func add_authorized_controller(principal: Principal) : async WalletResult<Text> {
        let caller = Principal.fromActor(Wallet);
        
        if (not isAuthorized(caller)) {
            return #err("Unauthorized: Only existing controllers can add new controllers");
        };

        if (isAuthorized(principal)) {
            return #err("Principal is already authorized");
        };

        authorized := Array.thaw(Array.append(Array.freeze(authorized), [principal]));
        #ok("Controller added successfully")
    };

    // Admin function: Remove authorized controller
    public func remove_authorized_controller(principal: Principal) : async WalletResult<Text> {
        let caller = Principal.fromActor(Wallet);
        
        if (not isAuthorized(caller)) {
            return #err("Unauthorized: Only existing controllers can remove controllers");
        };

        let filteredControllers = Array.filter<Principal>(
            Array.freeze(authorized), 
            func(p) = not Principal.equal(p, principal)
        );

        if (filteredControllers.size() == Array.freeze(authorized).size()) {
            return #err("Principal was not in the authorized list");
        };

        authorized := Array.thaw(filteredControllers);
        #ok("Controller removed successfully")
    };

    // Admin function: Get all authorized controllers (Query)
    public query func get_authorized_controllers() : async [Principal] {
        let caller = Principal.fromActor(Wallet);
        
        if (not isAuthorized(caller)) {
            return [];
        };

        Array.freeze(authorized)
    };
}