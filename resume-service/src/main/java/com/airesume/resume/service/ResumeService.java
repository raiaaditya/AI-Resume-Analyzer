package com.airesume.resume.service;

import com.airesume.resume.model.ResumeAnalysis;
import com.airesume.resume.repository.ResumeAnalysisRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class ResumeService {

    @Value("${AI_SERVICE_URL:http://localhost:5000}")
    private String aiServiceUrl;

    @Autowired
    private ResumeAnalysisRepository analysisRepository;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ResumeAnalysis analyzeResume(String username, MultipartFile file, String jobDescription) throws Exception {
        byte[] fileBytes = file.getBytes();
        String jdPart = jobDescription != null ? jobDescription.trim() : "";
        
        // Generate MD5 hash of (file contents + JD) to check cache
        String contentString = DigestUtils.md5DigestAsHex(fileBytes) + "_" + jdPart;
        String cacheKey = "analysis_cache:" + contentString;

        // Try to fetch from Redis Cache first
        try {
            ResumeAnalysis cached = (ResumeAnalysis) redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                System.out.println("Returning cached analysis result from Redis for key: " + cacheKey);
                // Even though it is cached, we might want to record it in the database for the active user history if they didn't do it before.
                // But typically, a new upload means a new scan. Let's make sure it is saved in history for the active user if it's not already.
                // However, to keep it simple, if cached, we just set the active username and save to PostgreSQL as a new entry.
                cached.setId(null); // Save as new entity
                cached.setUsername(username);
                cached.setDate(new SimpleDateFormat("dd/MM/yyyy").format(new Date()));
                analysisRepository.save(cached);
                
                // Evict user history list cache
                redisTemplate.delete("user_history:" + username);
                return cached;
            }
        } catch (Exception e) {
            System.err.println("Redis read error: " + e.getMessage());
        }

        // Cache miss -> call AI Service
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource fileAsResource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume.pdf";
            }
        };

        body.add("file", fileAsResource);
        if (!jdPart.isEmpty()) {
            body.add("jobDescription", jdPart);
        }

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        
        System.out.println("Forwarding request to AI Service from ResumeService: " + aiServiceUrl + "/api/analyze");
        ResponseEntity<String> response = restTemplate.postForEntity(
                aiServiceUrl + "/api/analyze",
                requestEntity,
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("AI service returned non-2xx status: " + response.getStatusCode());
        }

        // Parse AI service response JSON
        Map<String, Object> responseMap = objectMapper.readValue(response.getBody(), Map.class);

        ResumeAnalysis analysis = new ResumeAnalysis();
        analysis.setUsername(username);
        analysis.setFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume.pdf");
        analysis.setDate(new SimpleDateFormat("dd/MM/yyyy").format(new Date()));
        
        analysis.setAtsScore(((Number) responseMap.get("atsScore")).intValue());
        analysis.setMatchPercentage(((Number) responseMap.get("matchPercentage")).intValue());
        analysis.setExperienceYears(((Number) responseMap.get("experienceYears")).intValue());
        analysis.setIndustryCategory((String) responseMap.get("industryCategory"));
        analysis.setSeniority((String) responseMap.get("seniority"));
        
        analysis.setSkillsList((List<String>) responseMap.get("skills"));
        analysis.setMissingSkillsList((List<String>) responseMap.get("missingSkills"));
        analysis.setStrengthsList((List<String>) responseMap.get("strengths"));
        analysis.setWeaknessesList((List<String>) responseMap.get("weaknesses"));
        analysis.setRecommendationsList((List<String>) responseMap.get("recommendations"));
        analysis.setCareerSuggestionsList((List<String>) responseMap.get("careerSuggestions"));

        // Save to Database
        analysisRepository.save(analysis);

        // Cache in Redis for 1 Hour
        try {
            redisTemplate.opsForValue().set(cacheKey, analysis, 1, TimeUnit.HOURS);
            // Evict user history list cache
            redisTemplate.delete("user_history:" + username);
        } catch (Exception e) {
            System.err.println("Redis write error: " + e.getMessage());
        }

        return analysis;
    }

    public List<ResumeAnalysis> getHistory(String username) {
        String historyCacheKey = "user_history:" + username;

        // Try Redis first
        try {
            List<ResumeAnalysis> cachedHistory = (List<ResumeAnalysis>) redisTemplate.opsForValue().get(historyCacheKey);
            if (cachedHistory != null) {
                System.out.println("Returning cached history from Redis for user: " + username);
                return cachedHistory;
            }
        } catch (Exception e) {
            System.err.println("Redis read error: " + e.getMessage());
        }

        // Cache miss -> fetch from DB
        List<ResumeAnalysis> history = analysisRepository.findByUsernameOrderByIdDesc(username);

        // Cache in Redis for 10 minutes
        try {
            redisTemplate.opsForValue().set(historyCacheKey, history, 10, TimeUnit.MINUTES);
        } catch (Exception e) {
            System.err.println("Redis write error: " + e.getMessage());
        }

        return history;
    }
}
