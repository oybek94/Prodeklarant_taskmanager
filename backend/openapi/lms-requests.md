# LMS API Quick Requests (curl examples)

Base URL: http://localhost:3001/api/v1

Replace placeholders: `{{accessToken}}`, `<<lessonId>>`, `<<mediaId>>`, `<<examId>>`, etc.

---

## 1) Login (password-based)

curl -X POST "{{baseUrl}}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'

Response: { accessToken, refreshToken, user }

---

## 2) Create course (Admin)

curl -X POST "{{baseUrl}}/admin/courses" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Intro to Company","description":"Onboarding","requiredLevelId":1,"isPublished":true}'

---

## 3) Upload media to lesson (Admin, multipart)

curl -X POST "{{baseUrl}}/admin/lessons/<<lessonId>>/media" \
  -H "Authorization: Bearer {{accessToken}}" \
  -F "file=@/path/to/video.mp4" \
  -F "type=VIDEO" \
  -F "contentType=video/mp4"

Response includes `storageKey` and (after transcode) `hlsManifestKey`.

---

## 4) Request short-lived stream token (Learner)

curl -X POST "{{baseUrl}}/lessons/<<lessonId>>/stream-token" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{"mediaId":<<mediaId>>}'

Response: { token, expiresAt }

---

## 5) Stream media (player uses this URL)

Open player with: `{{baseUrl}}/media/stream/<<mediaId>>?token=<<TOKEN>>`

cURL (head request):

curl -I "{{baseUrl}}/media/stream/<<mediaId>>?token=<<TOKEN>>"

---

## 6) Get exam metadata

curl -X GET "{{baseUrl}}/exams/<<examId>>" \
  -H "Authorization: Bearer {{accessToken}}"

---

## 7) Submit exam answers (System exam)

curl -X POST "{{baseUrl}}/exams/<<examId>>/submit" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"questionId":1,"answer":"A"}]}'

Response: { scorePercent, status }

---

## 8) Admin: List pending practical exams

curl -X GET "{{baseUrl}}/admin/exam-results?status=PENDING" \
  -H "Authorization: Bearer {{accessToken}}"

---

## 9) Admin: Grade practical exam

curl -X POST "{{baseUrl}}/admin/exam-results/<<resultId>>/grade" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  -d '{"status":"PASSED","notes":"Good practical skills"}'

---

Notes:
- `{{baseUrl}}` can be `http://localhost:3001/api/v1` or your deployed base.
- For uploading large files, ensure server supports streaming upload and the request is proxied correctly.
- Streaming tokens are short-lived and should be requested by the client before initializing the player.

