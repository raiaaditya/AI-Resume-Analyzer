package com.airesume.resume.model;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(name = "resume_analyses")
public class ResumeAnalysis implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    private String filename;
    private String date;
    private int atsScore;
    private int matchPercentage;
    private int experienceYears;
    private String industryCategory;
    private String seniority;

    @Column(length = 2000)
    private String skills;

    @Column(length = 2000)
    private String missingSkills;

    @Column(length = 4000)
    private String strengths;

    @Column(length = 4000)
    private String weaknesses;

    @Column(length = 4000)
    private String recommendations;

    @Column(length = 4000)
    private String careerSuggestions;

    public ResumeAnalysis() {}

    // Helper methods for list conversion
    private String listToString(List<String> list) {
        if (list == null) return "";
        return list.stream()
                .map(s -> s.replace("|", "")) // sanitize separator
                .collect(Collectors.joining("|"));
    }

    private List<String> stringToList(String str) {
        if (str == null || str.trim().isEmpty()) return Collections.emptyList();
        return Arrays.asList(str.split("\\|"));
    }

    // Getters and Setters for List types
    public List<String> getSkillsList() {
        return stringToList(this.skills);
    }

    public void setSkillsList(List<String> list) {
        this.skills = listToString(list);
    }

    public List<String> getMissingSkillsList() {
        return stringToList(this.missingSkills);
    }

    public void setMissingSkillsList(List<String> list) {
        this.missingSkills = listToString(list);
    }

    public List<String> getStrengthsList() {
        return stringToList(this.strengths);
    }

    public void setStrengthsList(List<String> list) {
        this.strengths = listToString(list);
    }

    public List<String> getWeaknessesList() {
        return stringToList(this.weaknesses);
    }

    public void setWeaknessesList(List<String> list) {
        this.weaknesses = listToString(list);
    }

    public List<String> getRecommendationsList() {
        return stringToList(this.recommendations);
    }

    public void setRecommendationsList(List<String> list) {
        this.recommendations = listToString(list);
    }

    public List<String> getCareerSuggestionsList() {
        return stringToList(this.careerSuggestions);
    }

    public void setCareerSuggestionsList(List<String> list) {
        this.careerSuggestions = listToString(list);
    }

    // Standard Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public int getAtsScore() {
        return atsScore;
    }

    public void setAtsScore(int atsScore) {
        this.atsScore = atsScore;
    }

    public int getMatchPercentage() {
        return matchPercentage;
    }

    public void setMatchPercentage(int matchPercentage) {
        this.matchPercentage = matchPercentage;
    }

    public int getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(int experienceYears) {
        this.experienceYears = experienceYears;
    }

    public String getIndustryCategory() {
        return industryCategory;
    }

    public void setIndustryCategory(String industryCategory) {
        this.industryCategory = industryCategory;
    }

    public String getSeniority() {
        return seniority;
    }

    public void setSeniority(String seniority) {
        this.seniority = seniority;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getMissingSkills() {
        return missingSkills;
    }

    public void setMissingSkills(String missingSkills) {
        this.missingSkills = missingSkills;
    }

    public String getStrengths() {
        return strengths;
    }

    public void setStrengths(String strengths) {
        this.strengths = strengths;
    }

    public String getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(String weaknesses) {
        this.weaknesses = weaknesses;
    }

    public String getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(String recommendations) {
        this.recommendations = recommendations;
    }

    public String getCareerSuggestions() {
        return careerSuggestions;
    }

    public void setCareerSuggestions(String careerSuggestions) {
        this.careerSuggestions = careerSuggestions;
    }
}
