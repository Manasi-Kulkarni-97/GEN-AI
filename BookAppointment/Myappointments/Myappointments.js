import React, { useState, useEffect } from "react";
import { Col, Row, Card, Image, Spinner } from "react-bootstrap";
import Container from "react-bootstrap/Container";
import "./Myappointments.scss";
import Patient from "../../../_assets/images/patient_icon.svg";
import Figure from "react-bootstrap/Figure";
import { apiurlConstants } from "../../../_constants/apiurl.constants";
import { userService } from "../../../_services";
import jwt_decode from "jwt-decode";
import physicalVist from "../../../_assets/images/physical-consultation.svg";
import OnlineConsultation from "../../../_assets/images/video-consultation.svg";
import moment from "moment";
import { useHistory, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../../../_actions/user.actions";
import { Tooltip } from "@mui/material";
let interval;
const Myappointments = (props) => {
  let history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();

  const checkUserExist = () => {
    return localStorage.getItem("user_patient") == null;
  };
  if (checkUserExist()) {
    console.log("ItemData InIF Condition");
    history.push("/signin");
    window.location.reload(false);
  }
  const token = localStorage.getItem("user_patient");
  const decoded = jwt_decode(token);
  const [appointmentList, setAppointmentList] = useState();
  const [myAppointmentList, setMyAppointmentList] = useState([]);
  const [spinner, setSpinner] = useState(true);
  const [spinner_, setSpinner_] = useState(true);
  const utcToLoc = (time) => {
    console.log("utc time++++", time);
    let locTime = new Date(time);
    console.log("utc to local time++", locTime);
    console.log("local to utc time++", moment(locTime).utc());
    return locTime;
  };

  const locToUtc = (time) => {
    console.log("local time++++", time);
    let startLocalTime = moment(time).format("YYYY-MM-DDT00:00:00.000");
    let subtractedLoc = time.setMinutes(time.getMinutes() - 15);
    console.log("subtracted local time+++", subtractedLoc);
    let utcTime = moment
      .utc(new Date(startLocalTime))
      .format("YYYY-MM-DDTHH:mm:ss.SSS");
    console.log("local to utc time with diff++", utcTime);

    return utcTime;
  };

  useEffect(() => getPatientPhoto(), []);

  useEffect(() => {
    if (
      decoded.temporary_password === "YES" &&
      localStorage.tempPass == "NO" &&
      localStorage.APIPassword == "false"
    ) {
      localStorage.setItem("tempPass", decoded.temporary_password);
    }
    if (localStorage.tempPass == "YES") history.push("/resetpassword");
  }, [location]);

  const fetchPatientDetails = async () => {
    if (localStorage.getItem("patientDetails") == null) {
      setSpinner(true);
      try {
        const res = await userService.methodGet(
          apiurlConstants.PatientServiceUrl +
            "/patient-service/patients/basic-info/" +
            decoded.user_id
        );
        setAppointmentList([res.data]);
        localStorage.setItem("patientName", res.data.firstName);
        localStorage.setItem("patientDetails", JSON.stringify(res.data));
      } catch (err) {
        console.log("methodGet++ Error", err);
        const message =
          err?.response?.data?.message || err.message || err.toString();
        console.log("Error", message);
        if (
          err?.response?.status == 400 &&
          (message.toLowerCase().includes("JWT") ||
            message.toLowerCase().includes("expired"))
        ) {
          localStorage.removeItem("user_patient");
          dispatch(logout());
          history.push("/signin");
        }
      } finally {
        setSpinner(false);
      }
    } else {
      setSpinner(false);
    }
  };
  const fetchMailingAddress = async () => {
    if (localStorage.getItem("patientMailingAdrs") == null) {
      try {
        const res = await userService.methodGet(
          apiurlConstants.PatientServiceUrl +
            "/patient-service/patients/mailing-address/" +
            decoded.user_id
        );
        localStorage.setItem("patientMailingAdrs", JSON.stringify(res.data));
      } catch (err) {
        console.log("methodGet++ Error1", err);
      } finally {
        setSpinner(false);
      }
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await userService.methodGet(
        apiurlConstants.AppointmentServiceUrl +
          "/appointment-service/appointments?patient-id=" +
          decoded.user_id +
          "&from-date=" +
          locToUtc(new Date()) +
          "Z"
      );
      if (res.data.length > 0) {
        processAppointments(res.data);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || err.toString();
      console.log("methodGet++ Error", err);
      if (
        err?.response?.status == 400 &&
        (message.toLowerCase().includes("JWT") ||
          message.toLowerCase().includes("expired"))
      ) {
        localStorage.removeItem("user_patient");
        dispatch(logout());
        history.push("/signin");
      }

      console.log("Error", message);
    } finally {
      setSpinner_(false);
    }
  };
  const processAppointments = (data) => {
    const updatedAppointments = data.map((obj) => {
      const d1 = new Date();
      const d2 = utcToLoc(obj.startTime);
      const diff = d2 - d1;
      const count = Math.floor(diff / 60e3);
      if (count <= 15 && obj.status !== "CLOSED" && obj.status !== "CANCELED") {
        obj.showJoinCall = true;
      }
      return obj;
    });
    setMyAppointmentList(updatedAppointments);
    const interval = setInterval(() => {
      const updatedAppointments = data.map((obj) => {
        const d1 = new Date();
        const d2 = new Date(obj.startTime);
        const diff = d2 - d1;
        const count = Math.floor(diff / 60e3);
        if (
          count <= 15 &&
          obj.status !== "CLOSED" &&
          obj.status !== "CANCELED"
        ) {
          obj.showJoinCall = true;
        }
        return obj;
      });
      setMyAppointmentList(updatedAppointments);
    }, 10000);
    return () => clearInterval(interval);
  };
  const fetchNotificationStatus = async () => {
    try {
      const res = await userService.methodGet(
        apiurlConstants.PatientServiceUrl +
        "/patient-service/patients/" +
        decoded.user_id +
        "/notification-flag?" +
        "pageSize=1"
      );
      const notiArr = res.data.patientNotificationStatusDTOs.filter(i => i.status === true);
      localStorage.setItem("NotificationPoint", notiArr.length >= 1);
    } catch (err) {
      console.log("methodGet++ ErrorNotistatu11111s", err);
      const message =
          err?.response?.data?.message || err.message || err.toString();
        console.log("methodGet++ ErrorNotistatu11111s", err);
        if (
          err?.response?.status == 400 &&
          (message.toLowerCase().includes("JWT") ||
            message.toLowerCase().includes("expired"))
        ) {
          localStorage.removeItem("user_patient");
          dispatch(logout());
          history.push("/signin");
        }
    }
  };

  useEffect(() => {
    localStorage.setItem("book", 0);
    localStorage.setItem("book", 0);
    localStorage.removeItem("AppointmentPayload");
    localStorage.removeItem("careId");
    localStorage.removeItem("docId");
    localStorage.removeItem("stepper");
    localStorage.removeItem("medicalInfo");
    localStorage.removeItem("reasonforConsultation");
    localStorage.removeItem("careService");
    localStorage.removeItem("tab");
    localStorage.removeItem("reEx");
    localStorage.removeItem("bp");

    fetchPatientDetails();
    fetchMailingAddress();
    fetchAppointments();
    fetchNotificationStatus();

    
  }, []);

  const [baseImage, setBaseImage] = useState();
  const getPatientPhoto = (patient) => {
    userService
      .methodGetImage(
        apiurlConstants.PatientServiceUrl +
          "/patient-service/patients/" +
          decoded.user_id +
          "/images"
      )
      .then(async (res) => setBaseImage(res.data))
      .catch((err) => {});
  };

  const handleAdd = () => {
    if (localStorage.getItem("user_patient") == null) {
      history.push("/signin");
      window.location.reload(false);
    } else {
      userService
        .methodGet(
          apiurlConstants.PatientServiceUrl +
            "/patient-service/patients/mailing-address/" +
            decoded.user_id
        )
        .then(async (res) => {
          console.log("mailadresssssss", res.data);
          localStorage.setItem("patientMailingAdrs", JSON.stringify(res.data));
        })
        .catch((err) => {
          console.log("methodGet++ Error1", err);
        });
      history.push("/careCategories");
      localStorage.setItem("book", 1);
    }
  };
  const renderTypeImage = (type) => {
    const imageSrc =
      type === "PHYSICAL_VISIT" ? physicalVist : OnlineConsultation;
    return type ? <Image src={imageSrc} className="appointmntImg" /> : null;
  };

  const renderDoctorName = (doctor) => {
    const fullName =
      "Dr. " +
      doctor.firstName +
      " " +
      (doctor.lastName ? doctor.lastName : "");
    return (
      <Tooltip title={fullName}>
        <div className="doctor-name">
          <p className="ListContent_" style={{ opacity: "80%" }}>{fullName}</p>
        </div>
      </Tooltip>
    );
  };

  const renderStatus = (item) => {
    let statusColor = "";
    let statusText = "";

    if (item.status === "SCHEDULED") {
      statusColor = "#24CA77";
      statusText = "Upcoming";
    } else if (item.status === "CLOSED") {
      statusColor = "#707070";
      statusText = "Completed";
    } else if (item.status === "CANCELED") {
      statusText = "Cancelled";
    } else {
      statusText = item.status;
    }

    return (
      <p className="ListContent_status" style={{ color: statusColor }}>
        {statusText}
      </p>
    );
  };

  const renderJoinCall = (item) => {
    return (
      <div className="JoinCallHeader" style={{ padding: 0 }}>
        {item.type === "PHYSICAL_VISIT" ? (
          renderStatus(item)
        ) : (
          <p className="JoinCall" onClick={() => handleJoinCall(item)}>
            Join Call
          </p>
        )}
      </div>
    );
  };

  const handleJoinCall = (item) => {
    console.log("clicked", item.id);
    if (localStorage.getItem("user_patient") === null) {
      history.push("/signin");
      window.location.reload(false);
    } else {
      localStorage.setItem("VideoPatientDetails", JSON.stringify(item));
      history.push("/Video");
    }
  };

  const renderAppointment = (item, index) => {
    return (
      <div key={index} style={{ border: "1px solid rgba(0, 0, 0, 0.125)" }}>
        <Row key={index} className="text-align">
          <div className="appointment-col-data" style={{ width: "40%" }}>
            <div className="time-div-col">
              {renderTypeImage(item.type)}
              <div>
                <text className="ListContent">
                  {moment(item.startTime).local().format("hh:mm A")}
                </text>
                <br></br>
                <text className="ListDateContent">
                  {moment(item.startTime).local().format("DD-MMM-YYYY")}
                </text>
              </div>
            </div>
          </div>
          <div className="appointment-col-data" style={{ width: "30%" }}>
            {renderDoctorName(item.doctor)}
          </div>
          <div className="appointment-col-data" style={{ width: "30%" }}>
            {item.showJoinCall ? renderJoinCall(item) : renderStatus(item)}
          </div>
        </Row>
      </div>
    );
  };
  const renderedAppointments = myAppointmentList.map(renderAppointment);

  const renderMyAppointmens = () => {
    let appointmentsContent;

    if (spinner_) {
      appointmentsContent = (
        <div className="SpinnerView">
          <Spinner animation="border" variant="primary" />
        </div>
      );
    } else if (myAppointmentList != null && myAppointmentList.length > 0) {
      appointmentsContent = (
        <Card>
          <div className="appointment-history">
            <Row className="appointment-table-header">
              <div className="appointment-col-header" style={{ width: "40%" }}>
                Date & Time
              </div>
              <div className="appointment-col-header" style={{ width: "30%" }}>
                <p className="doc_name">Doctor</p>
              </div>
              <div
                className="appointment-col-header status_header"
                style={{ width: "30%" }}
              >
                <p className="status_name">Status</p>
              </div>
            </Row>
            <div>{renderedAppointments}</div>
          </div>
        </Card>
      );
    } else {
      appointmentsContent = (
        <Row className="justify-content-md-center align-items-center visit-block">
          <div md="auto" className="NoListdisplay">
            You don't have consultation history
          </div>
        </Row>
      );
    }
    return (
      <>
        <h6 className="header-Title">My Appointments</h6>
        <div className="cardDoctorListDoctorList">{appointmentsContent}</div>
      </>
    );
  };

  const renderPatientCards = () => {
    if (spinner) {
      return (
        <div className="SpinnerView">
          <Spinner animation="border" variant="primary" />
        </div>
      );
    } else if (appointmentList != null && appointmentList != undefined) {
      return (
        <Col>
          <Row className="cardItem">
            {appointmentList?.map((item, index) => (
              <Col
                key={item?.id || index}
                className="pat_name"
              >
                <Figure>
                  <Figure.Image
                    alt="Patient"
                    // width={115}
                    // height={115}
                    className="profile_image"
                    src={
                      baseImage ? `data:image/png;base64,${baseImage}` : Patient
                    }
                    onClick={handleAdd}
                  />
                  <Figure.Caption className="patient-name">
                    {item.firstName} {item.lastName}
                  </Figure.Caption>
                </Figure>
              </Col>
            ))}
            {/* <Col
              xs="6"
              lg="6"
              sm="6"
              style={{ opacity: "50%" }}
              className="pat_cmg_soon"
            >
              <Figure>
                <InfoTip content="Coming Soon" direction="top">
                  <Figure.Image
                    // width={115}
                    // height={115}
                    alt="Patient"
                    src={addPatient}
                    className="addPatient"
                  />
                </InfoTip>
                <Figure.Caption className="person-name">
                  Add a person
                </Figure.Caption>
              </Figure>
            </Col> */}
          </Row>
        </Col>
      );
    } else if (JSON.parse(localStorage.getItem("patientDetails")) != null) {
      return (
        <Col>
          <Row className="cardItem">
            <Col className="pat_name">
              <Figure>
                <Figure.Image
                  alt="Patient"
                  // width={115}
                  // height={115}
                  className="profile_image"
                  src={
                    baseImage ? `data:image/png;base64,${baseImage}` : Patient
                  }
                  onClick={handleAdd}
                />
                <Tooltip
                  placement="bottom"
                  PopperProps={{
                    sx: {
                      "& .MuiTooltip-tooltip ": {
                        border: "0%",
                        background: "transperant",
                        backgroundColor: "white",
                        color: "#232324",
                        boxShadow: "0px 5px 15px #44444F33",
                        fontFamily: "PoppinRegular",
                      },
                      "& .MuiTooltip-arrow::before ": {
                        backgroundColor: "white",
                        color: "white",
                      },
                    },
                  }}
                  title={`${
                    JSON.parse(localStorage.getItem("patientDetails")).firstName
                  } ${
                    JSON.parse(localStorage.getItem("patientDetails")).lastName
                  }`}
                >
                  <Figure.Caption className="patient-name">
                    {
                      JSON.parse(localStorage.getItem("patientDetails"))
                        .firstName
                    }{" "}
                    {
                      JSON.parse(localStorage.getItem("patientDetails"))
                        .lastName
                    }
                  </Figure.Caption>
                </Tooltip>
              </Figure>
            </Col>
          </Row>
        </Col>
      );
    } else {
      return <div></div>;
    }
  };
  return (
    <>
      {/* <div style={{ flex:0,height: '3vh' }}>
      <Header/>
    </div> */}

      <div
        className="dashboardBlock"
        style={{ flex: 1, height: "80vh", overflowY: "auto" }}
      >
        {spinner ? (
          <div className="SpinnerView">
            <div className="SpinnerElement">
              <Spinner animation="border" variant="primary"></Spinner>
            </div>
            <h4 className="SpinnerLoadingText">Loading...</h4>
          </div>
        ) : (
          <Container className="mainBlock">
            <h6 className="headerTitle">Book an appointment</h6>
            <Row className="justify-content-md-center appointment-block ">
              <Col md="12">
                <h6 className="app-title">
                  Select the member who needs help today ?
                </h6>
              </Col>

              <Col>{renderPatientCards()}</Col>
            </Row>
            {renderMyAppointmens()}
          </Container>
        )}{" "}
      </div>
      {/* <div style={{flex: 1, height: '10vh' }}><Footer/></div> */}
    </>
  );
};

export default Myappointments;
