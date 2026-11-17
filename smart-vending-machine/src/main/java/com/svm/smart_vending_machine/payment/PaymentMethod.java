
package com.svm.smart_vending_machine.payment;

public interface PaymentMethod {

    boolean pay(double amount);

    String getMethodName();
}
