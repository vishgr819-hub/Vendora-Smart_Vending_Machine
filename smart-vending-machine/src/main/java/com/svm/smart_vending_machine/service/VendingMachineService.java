
package com.svm.smart_vending_machine.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.svm.smart_vending_machine.model.Product;
import com.svm.smart_vending_machine.model.Transaction;
import com.svm.smart_vending_machine.payment.CashPayment;
import com.svm.smart_vending_machine.payment.PaymentMethod;
import com.svm.smart_vending_machine.payment.UPIPayment;
import com.svm.smart_vending_machine.repository.TransactionRepository;

@Service
public class VendingMachineService {

    private final InventoryService inventoryService;
    private final TransactionRepository transactionRepository;

    @Value("${vendora.simulation.dispensing-failure:false}")
    private boolean simulateDispensingFailure;

    public VendingMachineService(
            InventoryService inventoryService,
            TransactionRepository transactionRepository) {

        this.inventoryService = inventoryService;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public Map<String, Object> purchase(
            int productId,
            int quantity,
            String paymentType,
            double cashReceived) {

        Product product = inventoryService.getProductById(productId);

        if (product == null) {
            throw new IllegalArgumentException("Product not found.");
        }

        if (quantity <= 0) {
            throw new IllegalArgumentException(
                "Quantity must be at least 1."
            );
        }

        if (product.getStock() < quantity) {
            throw new IllegalArgumentException("Insufficient stock.");
        }

        double totalAmount = product.getPrice() * quantity;

        PaymentMethod paymentMethod;
        CashPayment cashPayment = null;

        if ("CASH".equalsIgnoreCase(paymentType)) {

            cashPayment = new CashPayment(cashReceived);
            paymentMethod = cashPayment;

        } else if ("UPI".equalsIgnoreCase(paymentType)) {

            paymentMethod = new UPIPayment();

        } else {

            throw new IllegalArgumentException(
                "Invalid payment method."
            );
        }

        if (!paymentMethod.pay(totalAmount)) {
            throw new IllegalArgumentException(
                "Insufficient cash received."
            );
        }

        // Payment succeeded. Now simulate physical dispensing.
        Transaction transaction = new Transaction(
            0,
            product.getName(),
            quantity,
            totalAmount,
            paymentMethod.getMethodName(),
            "SUCCESS"
        );

        transaction.setPaymentStatus("SUCCESSFUL");

        Map<String, Object> response = new LinkedHashMap<>();

        double change = 0;

        if (cashPayment != null) {
            change = cashPayment.getChange();
        }

        response.put("totalAmount", totalAmount);
        response.put("change", change);

        // Simulated mechanical failure
        if (simulateDispensingFailure) {

            transaction.setStatus("RECOVERY_PENDING");
            transaction.setDispensingStatus("FAILED");
            transaction.setFailureReason("MOTOR_MALFUNCTION");
            transaction.setRecoveryStatus("PENDING");

            transaction = transactionRepository.save(transaction);

            response.put("message",
                "Payment successful, but the machine could not dispense your product.");
            response.put("purchaseSuccessful", false);
            response.put("paymentStatus", "SUCCESSFUL");
            response.put("dispensingStatus", "FAILED");
            response.put("recoveryStatus", "PENDING");
            response.put("transaction", transaction);
            response.put("remainingStock", product.getStock());

            return response;
        }

        // Normal successful dispensing
        boolean stockUpdated = inventoryService.updateStock(
            productId,
            -quantity
        );

        if (!stockUpdated) {
            throw new IllegalStateException(
                "Unable to update product stock."
            );
        }

        transaction.setStatus("SUCCESS");
        transaction.setDispensingStatus("SUCCESS");
        transaction.setFailureReason(null);
        transaction.setRecoveryStatus("NONE");

        transaction = transactionRepository.save(transaction);

        response.put("message", "Purchase successful!");
        response.put("purchaseSuccessful", true);
        response.put("paymentStatus", "SUCCESSFUL");
        response.put("dispensingStatus", "SUCCESS");
        response.put("recoveryStatus", "NONE");
        response.put("transaction", transaction);
        response.put("remainingStock", product.getStock());

        return response;
    }

    // Retrieve all transactions
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll();
    }
}
