package com.chatapp.controller;

import com.chatapp.dto.FileDto;
import com.chatapp.model.File;
import com.chatapp.service.FileService;
import com.chatapp.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = {"http://localhost:3000","*"})
public class FileController {
    @Autowired
    private FileService fileService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/upload")
    public ResponseEntity<FileDto> uploadFile(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        try {
            String token = extractToken(request);
            Long userId = jwtUtil.extractUserId(token);

            File savedFile = fileService.saveFile(file, userId);

            FileDto fileDto = new FileDto();
            fileDto.setId(savedFile.getId());
            fileDto.setOriginalName(savedFile.getOriginalName());
            fileDto.setFileSize(savedFile.getFileSize());
            fileDto.setMimeType(savedFile.getMimeType());
            fileDto.setDownloadUrl("/api/files/download/" + savedFile.getId());

            return ResponseEntity.ok(fileDto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/download/{fileId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileId) {
        try {
            File file = fileService.getFile(fileId);
            Resource resource = fileService.loadFileAsResource(fileId);

            String contentType = file.getMimeType();
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            // For images, use inline display instead of attachment
            String contentDisposition = "inline";
            if (!contentType.startsWith("image/")) {
                contentDisposition = "attachment; filename=\"" + file.getOriginalName() + "\"";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .header(HttpHeaders.EXPIRES, "0")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<FileDto> getFileInfo(@PathVariable Long fileId) {
        try {
            File file = fileService.getFile(fileId);
            FileDto fileDto = new FileDto();
            fileDto.setId(file.getId());
            fileDto.setOriginalName(file.getOriginalName());
            fileDto.setFileSize(file.getFileSize());
            fileDto.setMimeType(file.getMimeType());
            fileDto.setDownloadUrl("/api/files/download/" + file.getId());
            return ResponseEntity.ok(fileDto);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new RuntimeException("No token found");
    }
}

