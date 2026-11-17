
package com.svm.smart_vending_machine.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.svm.smart_vending_machine.model.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {

}
