package com.airesume.resume.repository;

import com.airesume.resume.model.ResumeAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResumeAnalysisRepository extends JpaRepository<ResumeAnalysis, Long> {
    List<ResumeAnalysis> findByUsernameOrderByIdDesc(String username);
}
