
package com.svm.smart_vending_machine.payment;

public class UPIPayment implements PaymentMethod {

    @Override
    public boolean pay(double amount) {

        // Simulate a successful UPI payment
        return true;
    }

    @Override
    public String getMethodName() {
        return "UPI";
    }
}
