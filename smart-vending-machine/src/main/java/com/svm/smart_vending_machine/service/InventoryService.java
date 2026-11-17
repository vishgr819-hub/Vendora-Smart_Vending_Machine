
package com.svm.smart_vending_machine.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.svm.smart_vending_machine.model.Product;
import com.svm.smart_vending_machine.repository.ProductRepository;

import jakarta.annotation.PostConstruct;

@Service
public class InventoryService {

    private final ProductRepository productRepository;

    public InventoryService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // Insert sample products only when the database is empty
    @PostConstruct
    public void initializeProducts() {

        if (productRepository.count() == 0) {

            productRepository.save(new Product(
                null, "Lays Classic",
                "Classic salted potato chips",
                "Snacks", 20.0,
                "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500",
                15, 5
            ));

            productRepository.save(new Product(
                null, "Coca-Cola",
                "Chilled refreshing cola",
                "Beverages", 40.0,
                "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500",
                10, 5
            ));

            productRepository.save(new Product(
                null, "Dairy Milk",
                "Smooth milk chocolate",
                "Chocolates", 30.0,
                "https://images.unsplash.com/photo-1511381939415-e44015466834?w=500",
                3, 5
            ));

            productRepository.save(new Product(
                null, "Oreo",
                "Chocolate sandwich biscuits",
                "Snacks", 10.0,
                "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500",
                20, 5
            ));
        }
    }

    // Get all products
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    // Get product by ID
    public Product getProductById(int id) {
        return productRepository.findById(id).orElse(null);
    }

    // Add new product
    public Product addProduct(Product product) {

        product.setId(null); // Ensure the ID is null for new products

        return productRepository.save(product);
    }

    // Update existing product
    public Product updateProduct(int id, Product updatedProduct) {

        Product existingProduct = getProductById(id);

        if (existingProduct == null) {
            return null;
        }

        existingProduct.setName(updatedProduct.getName());
        existingProduct.setDescription(updatedProduct.getDescription());
        existingProduct.setCategory(updatedProduct.getCategory());
        existingProduct.setPrice(updatedProduct.getPrice());
        existingProduct.setImageUrl(updatedProduct.getImageUrl());
        existingProduct.setStock(updatedProduct.getStock());
        existingProduct.setLowStockThreshold(
            updatedProduct.getLowStockThreshold()
        );

        return productRepository.save(existingProduct);
    }

    // Delete product
    public boolean deleteProduct(int id) {

        if (!productRepository.existsById(id)) {
            return false;
        }

        productRepository.deleteById(id);

        return true;
    }

    // Update stock
    public boolean updateStock(int id, int quantity) {

        Product product = getProductById(id);

        if (product == null || product.getStock() + quantity < 0) {
            return false;
        }

        product.setStock(product.getStock() + quantity);

        productRepository.save(product);

        return true;
    }
}
