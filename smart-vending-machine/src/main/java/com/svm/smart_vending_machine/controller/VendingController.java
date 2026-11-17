
package com.svm.smart_vending_machine.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.svm.smart_vending_machine.service.VendingMachineService;

@RestController
@RequestMapping("/api/vending")
public class VendingController {

    private final VendingMachineService vendingMachineService;

    public VendingController(VendingMachineService vendingMachineService) {
        this.vendingMachineService = vendingMachineService;
    }

    @GetMapping("/status")
    public Map<String, String> getStatus() {
        return Map.of(
            "application", "SmartVendingMachine",
            "status", "RUNNING",
            "message", "Welcome to Smart Vending Machine!"
        );
    }

    @PostMapping("/purchase")
    public ResponseEntity<Map<String, Object>> purchase(
            @RequestBody Map<String, Object> request) {

        try {
            int productId = ((Number) request.get("productId")).intValue();
            int quantity = ((Number) request.get("quantity")).intValue();

            String paymentType = (String) request.get("paymentType");

            double cashReceived = request.get("cashReceived") == null
                    ? 0
                    : ((Number) request.get("cashReceived")).doubleValue();

            Map<String, Object> result = vendingMachineService.purchase(
                productId,
                quantity,
                paymentType,
                cashReceived
            );

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                Map.of("error", e.getMessage())
            );

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Something went wrong."));
        }
    }
}
