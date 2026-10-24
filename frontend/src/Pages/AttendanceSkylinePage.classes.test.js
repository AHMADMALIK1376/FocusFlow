import { classStatus } from "./AttendanceSkylinePage";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../services/api", () => ({ subjectAttendanceAPI: {} }));

test("each attendance status reads clearly in the hover", () => {
  expect(classStatus("Present").text).toBe("Attended");
  expect(classStatus("Late").text).toBe("Attended (late)");
  expect(classStatus("Absent").text).toBe("Missed");
  expect(classStatus("Excused").text).toBe("Excused");
});

test("attended and late share the good tone, missed has its own, unknown is neutral", () => {
  expect(classStatus("Present").tone).toBe(classStatus("Late").tone);
  expect(classStatus("Absent").tone).not.toBe(classStatus("Present").tone);
  expect(classStatus("???").text).toBe("???");
  expect(classStatus(undefined).text).toBe("Unknown");
});
