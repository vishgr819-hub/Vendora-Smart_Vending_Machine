
package com.svm.smart_vending_machine.controller;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.*;

import com.svm.smart_vending_machine.model.Product;
import com.svm.smart_vending_machine.model.Transaction;
import com.svm.smart_vending_machine.service.InventoryService;
import com.svm.smart_vending_machine.service.VendingMachineService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final InventoryService inventoryService;
    private final VendingMachineService vendingMachineService;

    public AdminController(
            InventoryService inventoryService,
            VendingMachineService vendingMachineService) {

        this.inventoryService = inventoryService;
        this.vendingMachineService = vendingMachineService;
    }

    @GetMapping("/transactions")
    public List<Transaction> getTransactions() {
        return vendingMachineService.getAllTransactions();
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {

        List<Product> products = inventoryService.getAllProducts();

        List<Transaction> transactions =
                vendingMachineService.getAllTransactions();

        double totalSales = transactions.stream()
                .mapToDouble(t -> t.getTotalAmount())
                .sum();

        long lowStockCount = products.stream()
                .filter(p -> p.isLowStock())
                .count();

        // Calculate sales for the last seven days
        List<Map<String, Object>> dailySales = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {

            LocalDate date = LocalDate.now().minusDays(i);

            double sales = transactions.stream()
                    .filter(t -> t.getTimestamp() != null
                            && t.getTimestamp().toLocalDate().equals(date))
                    .mapToDouble(t -> t.getTotalAmount())
                    .sum();

            String day = date.getDayOfWeek()
                    .getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

            dailySales.add(Map.of(
                    "day", day,
                    "sales", sales
            ));
        }

        // Find the most popular products
        Map<String, Integer> productQuantities = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getProductName(),
                        Collectors.summingInt(t -> t.getQuantity())
                ));

        List<Map<String, Object>> popularProducts =
                productQuantities.entrySet().stream()
                        .sorted(Comparator.comparingInt(
                                (Map.Entry<String, Integer> entry) ->
                                        entry.getValue()
                        ).reversed())
                        .limit(5)
                        .map(entry -> Map.<String, Object>of(
                                "name", entry.getKey(),
                                "quantity", entry.getValue()
                        ))
                        .collect(Collectors.toList());

        Map<String, Object> summary = new LinkedHashMap<>();

        summary.put("totalSales", totalSales);
        summary.put("totalTransactions", transactions.size());
        summary.put("totalProducts", products.size());
        summary.put("lowStockProducts", lowStockCount);
        summary.put("dailySales", dailySales);
        summary.put("popularProducts", popularProducts);

        return summary;
    }
}
