
package com.svm.smart_vending_machine.payment;

public class CashPayment implements PaymentMethod {

    private double cashReceived;
    private double change;

    public CashPayment(double cashReceived) {
        this.cashReceived = cashReceived;
    }

    @Override
    public boolean pay(double amount) {

        if (cashReceived >= amount) {
            change = cashReceived - amount;
            return true;
        }

        return false;
    }

    @Override
    public String getMethodName() {
        return "CASH";
    }

    public double getChange() {
        return change;
    }
}
