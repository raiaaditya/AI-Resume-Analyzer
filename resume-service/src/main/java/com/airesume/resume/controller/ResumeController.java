package com.airesume.resume.controller;

import com.airesume.resume.dto.ResumeAnalysisResponse;
import com.airesume.resume.model.ResumeAnalysis;
import com.airesume.resume.service.ResumeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    @Autowired
    private ResumeService resumeService;

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobDescription", required = false) String jobDescription) {
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        System.out.println("Processing analysis request for user: " + username + ", file: " + file.getOriginalFilename());
        
        try {
            ResumeAnalysis analysis = resumeService.analyzeResume(username, file, jobDescription);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new ResumeAnalysisResponse(analysis));

        } catch (Exception e) {
            System.err.println("Error analyzing resume: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\": \"Error analyzing resume: " + e.getMessage().replace("\"", "'") + "\"}");
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        System.out.println("Fetching resume analysis history for user: " + username);
        
        try {
            List<ResumeAnalysis> history = resumeService.getHistory(username);
            List<ResumeAnalysisResponse> response = history.stream()
                    .map(ResumeAnalysisResponse::new)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);
        } catch (Exception e) {
            System.err.println("Error fetching history: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\": \"Error fetching history: " + e.getMessage().replace("\"", "'") + "\"}");
        }
    }
}
